// Some browser builds of SockJS/STOMP expect a Node-style `global`. Loaded as a file instead of an
// inline <script> so the Content-Security-Policy can forbid inline scripts.
window.global = window;
