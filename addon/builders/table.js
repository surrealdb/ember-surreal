export default function(table, options={}) {

	let bits = [];

	let vars = options.param || {};

	vars.tb = table;

	bits.push('SELECT');

	if (options.fetch) {
		bits.push( options.fetch.join(', ') );
	} else {
		bits.push('*');
	}

	bits.push('FROM table($tb)');

	if (options.where && options.where.length) {
		bits.push(`WHERE ${options.where.join(' AND ')}`);
	}

	if (options.group) {
		bits.push(`GROUP BY ${options.group}`);
	}

	if (options.order) {
		bits.push(`ORDER BY ${options.order}`);
	}

	if (options.limit) {
		bits.push('LIMIT BY $limit');
		vars.limit = options.limit;
	}

	if (options.start) {
		bits.push('START AT $start');
		vars.start = options.start;
	}

	if (options.version) {
		bits.push('VERSION $versn');
		vars.versn = options.version;
	}

	return { text: bits.join(' '), vars };

}
