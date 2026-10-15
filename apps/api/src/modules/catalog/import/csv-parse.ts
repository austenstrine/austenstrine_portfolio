export type CsvParseResult = {
	delimiter: ',' | '\t';
	headers: string[];
	rows: Array<{ lineNumber: number; values: Record<string, string> }>;
};

function sniffDelimiter(text: string): ',' | '\t' {
	const firstLine = text.split(/\r?\n/).find((line) => line.trim().length > 0) ?? '';
	const tabs = (firstLine.match(/\t/g) ?? []).length;
	const commas = (firstLine.match(/,/g) ?? []).length;
	return tabs > commas ? '\t' : ',';
}

function parseLine(line: string, delimiter: ',' | '\t'): string[] {
	const cells: string[] = [];
	let current = '';
	let inQuotes = false;

	for(let i = 0; i < line.length; i += 1) {
		const ch = line[i];
		if(inQuotes) {
			if(ch === '"') {
				if(line[i + 1] === '"') {
					current += '"';
					i += 1;
				}
				else {
					inQuotes = false;
				}
			}
			else {
				current += ch;
			}
			continue;
		}

		if(ch === '"') {
			inQuotes = true;
			continue;
		}

		if(ch === delimiter) {
			cells.push(current);
			current = '';
			continue;
		}

		current += ch;
	}

	cells.push(current);
	return cells.map((cell) => cell.trim());
}

export function parseDelimitedCatalog(text: string): CsvParseResult {
	const normalized = text.replace(/^\uFEFF/, '');
	const delimiter = sniffDelimiter(normalized);
	const lines = normalized.split(/\r?\n/);
	const nonEmpty = lines
		.map((line, index) => ({ line, lineNumber: index + 1 }))
		.filter((row) => row.line.trim().length > 0);

	if(nonEmpty.length === 0) {
		return { delimiter, headers: [], rows: [] };
	}

	const headers = parseLine(nonEmpty[0].line, delimiter).map((header) =>
		header.trim().toLowerCase(),
	);
	const rows: CsvParseResult['rows'] = [];

	for(const row of nonEmpty.slice(1)) {
		const cells = parseLine(row.line, delimiter);
		const values: Record<string, string> = {};
		headers.forEach((header, index) => {
			if(!header) {
				return;
			}
			values[header] = cells[index] ?? '';
		});
		rows.push({ lineNumber: row.lineNumber, values });
	}

	return { delimiter, headers, rows };
}

export const CATALOG_IMPORT_REQUIRED_HEADERS = [
	'product_slug',
	'title',
	'sku',
	'offering_key',
	'uom_code',
	'role',
	'price',
] as const;

export const CATALOG_IMPORT_TEMPLATE_CSV = `product_slug,title,description,category_slug,active,sku,offering_key,uom_code,role,price,currency,qty_on_hand,tracks_own_qty,min_unbroken_qty,break_pool_above_qty,inherit_qty_to_children,parent_offering_key,child_qty_per_parent,break_fee_mode,break_fee_cents,attr.gauge,attr.conductor
thhn-12-gauge-wire,THHN 12 AWG Copper Wire,Sold as spools or by the foot,wire-and-cable,true,WIRE-THHN-12,spool,SPOOL,PACK,89.99,USD,3,true,0,0,true,,,OFF,0,12 AWG,Copper
thhn-12-gauge-wire,THHN 12 AWG Copper Wire,Sold as spools or by the foot,wire-and-cable,true,WIRE-THHN-12,foot,FT,PIECE,0.22,USD,0,false,-1,0,false,spool,500,OFF,0,12 AWG,Copper
`;
