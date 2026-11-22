#!/bin/sh
# Render Asterisk conf from env, then exec asterisk foreground.
set -eu

need() {
	eval "v=\${$1-}"
	if [ -z "$v" ]; then
		echo "entrypoint: missing required env $1" >&2
		exit 1
	fi
}

need SIP_KID_SECRET
need SIP_CUSTODIAN_SECRET
need SIP_EXTERNAL_MEDIA_ADDRESS
need SIP_EXTERNAL_SIGNALING_ADDRESS

SIP_PUBLIC_HOST="${SIP_PUBLIC_HOST:-sip.austenstrine.dev}"
SIP_RTP_START="${SIP_RTP_START:-10000}"
SIP_RTP_END="${SIP_RTP_END:-10100}"
SIP_HTTP_BIND="${SIP_HTTP_BIND:-0.0.0.0}"
SIP_HTTP_PORT="${SIP_HTTP_PORT:-8088}"
SIP_UDP_PORT="${SIP_UDP_PORT:-5060}"
SIP_KID_USER="${SIP_KID_USER:-kid}"
SIP_CUSTODIAN_USER="${SIP_CUSTODIAN_USER:-custodian}"
SIP_CONTEXT="${SIP_CONTEXT:-custodian-internal}"

# Seed defaults from image, then overlay static + rendered templates.
if [ -d /etc/asterisk ] && [ ! -f /etc/asterisk/.custodian-seeded ]; then
	touch /etc/asterisk/.custodian-seeded
fi

cp -a /static/. /etc/asterisk/

# Minimal envsubst (no gettext dependency in slim images).
render() {
	src="$1"
	dst="$2"
	sed \
		-e "s|__SIP_PUBLIC_HOST__|${SIP_PUBLIC_HOST}|g" \
		-e "s|__SIP_EXTERNAL_MEDIA_ADDRESS__|${SIP_EXTERNAL_MEDIA_ADDRESS}|g" \
		-e "s|__SIP_EXTERNAL_SIGNALING_ADDRESS__|${SIP_EXTERNAL_SIGNALING_ADDRESS}|g" \
		-e "s|__SIP_RTP_START__|${SIP_RTP_START}|g" \
		-e "s|__SIP_RTP_END__|${SIP_RTP_END}|g" \
		-e "s|__SIP_HTTP_BIND__|${SIP_HTTP_BIND}|g" \
		-e "s|__SIP_HTTP_PORT__|${SIP_HTTP_PORT}|g" \
		-e "s|__SIP_UDP_PORT__|${SIP_UDP_PORT}|g" \
		-e "s|__SIP_KID_USER__|${SIP_KID_USER}|g" \
		-e "s|__SIP_KID_SECRET__|${SIP_KID_SECRET}|g" \
		-e "s|__SIP_CUSTODIAN_USER__|${SIP_CUSTODIAN_USER}|g" \
		-e "s|__SIP_CUSTODIAN_SECRET__|${SIP_CUSTODIAN_SECRET}|g" \
		-e "s|__SIP_CONTEXT__|${SIP_CONTEXT}|g" \
		"$src" >"$dst"
}

render /templates/http.conf.tpl /etc/asterisk/http.conf
render /templates/rtp.conf.tpl /etc/asterisk/rtp.conf
render /templates/pjsip.conf.tpl /etc/asterisk/pjsip.conf
render /templates/extensions.conf.tpl /etc/asterisk/extensions.conf

# Drop secrets from process environment before exec (conf already written).
unset SIP_KID_SECRET SIP_CUSTODIAN_SECRET

exec asterisk -f -vvv
