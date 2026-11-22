; Generated — AuLorSt Custodian SIP (GSSA-28)
; Internal dial only: kid ↔ custodian by extension name. No PSTN trunk.

[general]
static=yes
writeprotect=no

[__SIP_CONTEXT__]
; Dial peer by SIP user id (kid / custodian)
exten => __SIP_KID_USER__,1,NoOp(Dial kid)
 same => n,Dial(PJSIP/__SIP_KID_USER__,60)
 same => n,Hangup()

exten => __SIP_CUSTODIAN_USER__,1,NoOp(Dial custodian)
 same => n,Dial(PJSIP/__SIP_CUSTODIAN_USER__,60)
 same => n,Hangup()

; Echo test for register/media smoke
exten => 999,1,NoOp(Echo test)
 same => n,Answer()
 same => n,Echo()
 same => n,Hangup()
