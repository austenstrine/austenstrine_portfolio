; Generated — AuLorSt Custodian SIP (GSSA-28 / GSSA-100)
; Peers: kid + custodian only. No anonymous inbound. Auth required.

[global]
type=global
; No ip/anonymous identifiers — username/auth only (dynamic kid IP safe).
endpoint_identifier_order=username,auth_username
; Rate-limit unidentified REGISTER/INVITE storms (auth_username path).
unidentified_request_count=5
unidentified_request_period=5
unidentified_request_prune_interval=30

[transport-udp]
type=transport
protocol=udp
bind=0.0.0.0:__SIP_UDP_PORT__
external_media_address=__SIP_EXTERNAL_MEDIA_ADDRESS__
external_signaling_address=__SIP_EXTERNAL_SIGNALING_ADDRESS__

[transport-tcp]
type=transport
protocol=tcp
bind=0.0.0.0:__SIP_UDP_PORT__
external_media_address=__SIP_EXTERNAL_MEDIA_ADDRESS__
external_signaling_address=__SIP_EXTERNAL_SIGNALING_ADDRESS__

; WS via Asterisk HTTP (http.conf). nginx terminates WSS → Asterisk WS :8088
[transport-ws]
type=transport
protocol=ws
bind=0.0.0.0
external_media_address=__SIP_EXTERNAL_MEDIA_ADDRESS__
external_signaling_address=__SIP_EXTERNAL_SIGNALING_ADDRESS__

; ---- kid ----
[__SIP_KID_USER__]
type=endpoint
context=__SIP_CONTEXT__
disallow=all
allow=opus,ulaw,alaw
auth=__SIP_KID_USER__
aors=__SIP_KID_USER__
identify_by=username,auth_username
allow_unauthenticated_options=no
direct_media=no
rtp_symmetric=yes
force_rport=yes
rewrite_contact=yes
media_encryption=no

[__SIP_KID_USER__]
type=auth
auth_type=userpass
username=__SIP_KID_USER__
password=__SIP_KID_SECRET__

[__SIP_KID_USER__]
type=aor
max_contacts=3
remove_existing=yes
qualify_frequency=60

; ---- custodian ----
[__SIP_CUSTODIAN_USER__]
type=endpoint
context=__SIP_CONTEXT__
disallow=all
allow=opus,ulaw,alaw
auth=__SIP_CUSTODIAN_USER__
aors=__SIP_CUSTODIAN_USER__
identify_by=username,auth_username
allow_unauthenticated_options=no
direct_media=no
rtp_symmetric=yes
force_rport=yes
rewrite_contact=yes
media_encryption=no

[__SIP_CUSTODIAN_USER__]
type=auth
auth_type=userpass
username=__SIP_CUSTODIAN_USER__
password=__SIP_CUSTODIAN_SECRET__

[__SIP_CUSTODIAN_USER__]
type=aor
max_contacts=3
remove_existing=yes
qualify_frequency=60
