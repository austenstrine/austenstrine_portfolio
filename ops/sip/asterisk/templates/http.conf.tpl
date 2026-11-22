; Generated — AuLorSt Custodian SIP (GSSA-28)
; TLS for WSS terminates on portfolio-proxy (sip.austenstrine.dev → WS :8088).

[general]
enabled=yes
bindaddr=__SIP_HTTP_BIND__
bindport=__SIP_HTTP_PORT__
enablestatic=no
sessionlimit=100
; WS path used by PJSIP transport-ws (clients: wss://sip…/ws)
