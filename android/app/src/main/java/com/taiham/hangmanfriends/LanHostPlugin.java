package com.taiham.hangmanfriends;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;

import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.NetworkInterface;
import java.util.Enumeration;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

// Local-network multiplayer, no internet required: whichever phone taps
// "Host" runs this plugin's WebSocket server, and every other phone
// connects to it as a plain client over the browser's built-in WebSocket
// API (no plugin needed on that side - only accepting incoming
// connections needs native code; making an outgoing one doesn't).
//
// Expects every device to already be on the same WiFi network (a home/
// venue network, or one player's phone hotspot that everyone else joins) -
// that's what makes IP discovery reliable. If the host device were
// instead the one *running* the hotspot, its own AP-mode IP is
// surprisingly inconsistent across Android versions/manufacturers, so
// this deliberately doesn't try to special-case that.
@CapacitorPlugin(name = "LanHost")
public class LanHostPlugin extends Plugin {
    private WebSocketServer server;
    private final Map<String, WebSocket> clients = new ConcurrentHashMap<>();

    @PluginMethod
    public void start(PluginCall call) {
        if (server != null) {
            call.resolve(statusResult());
            return;
        }
        int port = call.getInt("port", 8787);

        server = new WebSocketServer(new InetSocketAddress(port)) {
            @Override
            public void onOpen(WebSocket conn, ClientHandshake handshake) {
                String clientId = UUID.randomUUID().toString();
                conn.setAttachment(clientId);
                clients.put(clientId, conn);
                JSObject data = new JSObject();
                data.put("clientId", clientId);
                notifyListeners("clientConnected", data);
            }

            @Override
            public void onClose(WebSocket conn, int code, String reason, boolean remote) {
                String clientId = conn.getAttachment();
                if (clientId != null) {
                    clients.remove(clientId);
                    JSObject data = new JSObject();
                    data.put("clientId", clientId);
                    notifyListeners("clientDisconnected", data);
                }
            }

            @Override
            public void onMessage(WebSocket conn, String message) {
                String clientId = conn.getAttachment();
                JSObject data = new JSObject();
                data.put("clientId", clientId);
                data.put("message", message);
                notifyListeners("clientMessage", data);
            }

            @Override
            public void onError(WebSocket conn, Exception ex) {
                JSObject data = new JSObject();
                data.put("message", ex.getMessage() == null ? "Unknown server error" : ex.getMessage());
                notifyListeners("serverError", data);
            }

            @Override
            public void onStart() {
                // Nothing to do here - onOpen fires per-connection instead.
            }
        };
        server.setReuseAddr(true);
        server.start();

        call.resolve(statusResult());
    }

    @PluginMethod
    public void stop(PluginCall call) {
        try {
            if (server != null) {
                server.stop();
                server = null;
            }
            clients.clear();
        } catch (Exception ignored) {
            // best-effort shutdown
        }
        call.resolve();
    }

    // clientId omitted/null = broadcast to every connected peer.
    @PluginMethod
    public void send(PluginCall call) {
        String message = call.getString("message");
        if (message == null) {
            call.reject("message is required");
            return;
        }
        String clientId = call.getString("clientId");
        if (clientId != null) {
            WebSocket conn = clients.get(clientId);
            if (conn != null && conn.isOpen()) conn.send(message);
        } else {
            for (WebSocket conn : clients.values()) {
                if (conn.isOpen()) conn.send(message);
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        call.resolve(statusResult());
    }

    private JSObject statusResult() {
        JSObject result = new JSObject();
        result.put("ipAddress", currentIpAddress());
        result.put("port", server != null ? server.getPort() : null);
        result.put("running", server != null);
        return result;
    }

    // Enumerates network interfaces directly rather than going through
    // WifiManager, since WifiManager's "connection info" reflects this
    // device acting as a WiFi *client* - the common, reliable case here
    // (everyone, including the host, joins the same WiFi/hotspot network
    // and gets a normal DHCP-assigned address).
    private String currentIpAddress() {
        try {
            Enumeration<NetworkInterface> ifaces = NetworkInterface.getNetworkInterfaces();
            while (ifaces.hasMoreElements()) {
                NetworkInterface iface = ifaces.nextElement();
                if (!iface.isUp() || iface.isLoopback()) continue;
                Enumeration<InetAddress> addrs = iface.getInetAddresses();
                while (addrs.hasMoreElements()) {
                    InetAddress addr = addrs.nextElement();
                    if (addr instanceof java.net.Inet4Address && !addr.isLoopbackAddress()) {
                        return addr.getHostAddress();
                    }
                }
            }
        } catch (Exception e) {
            // fall through to null - the UI shows "couldn't detect IP" and
            // lets the host check it manually in their WiFi settings.
        }
        return null;
    }
}
