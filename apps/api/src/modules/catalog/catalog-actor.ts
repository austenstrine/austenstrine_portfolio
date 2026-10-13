export type UserCatalogActor = {
	kind: 'user';
	userId: string;
};

export type AppPasswordCatalogActor = {
	kind: 'app_password';
	vendorId: string;
	passwordId: string;
	createdByUserId: string;
};

export type CatalogActor = UserCatalogActor | AppPasswordCatalogActor;

export function catalogActorUserId(actor: CatalogActor): string | undefined {
	return actor.kind === 'user' ? actor.userId : actor.createdByUserId;
}
