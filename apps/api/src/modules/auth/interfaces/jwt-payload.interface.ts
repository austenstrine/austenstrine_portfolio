export type AccessTokenPayload = {
  sub: string;
  email: string;
  type: 'access';
};

export type PendingLoginTokenPayload = {
  sub: string;
  type: 'login_2fa';
};
