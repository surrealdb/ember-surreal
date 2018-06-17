import O from '@ember/object';
import Evented from '@ember/object/evented';

export default O.extend(Evented, {

	init(db, what=[], opts={}) {

		this.db = db;

		this.what = what;

		this.opts = opts;

		this.db.when('closed', () => {
			this.id = null;
		});

		this.db.when('opened', () => {
			if (!this.id) this.open();
		});

	},

	kill() {

		if (!this.id) return;

		let res = this.db.kill(this.id);

		this.id = null;

		return res;

	},

	open() {

		let bits = [];

		let vars = this.opts.param || {};

		vars.tb = this.what;

		bits.push(`LIVE SELECT * FROM table($tb)`);

		if (this.opts.where && this.opts.where.length) {
			bits.push('WHERE');
			bits.push(this.opts.where.join(' AND '));
		}

		if (this.opts.fetch && this.opts.fetch.length) {
			bits.push('FETCH');
			bits.push(this.opts.where.join(', '));
		}

		this.db.query(bits.join(' '), vars).then(res => {
			if (res[0] && res[0].result && res[0].result[0]) {
				this.id = res[0].result[0];
			}
		});

	},

});
