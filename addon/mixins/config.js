import { typeOf } from '@ember/utils';
import { getOwner } from '@ember/application';
import Mixin from '@ember/object/mixin';
import { uri } from '../utils/conf';
import unid from '../utils/unid';

export default Mixin.create({

	init() {

		this._super(...arguments);

		let config = getOwner(this).resolveRegistration('config:environment');

		if (typeOf(config) !== 'object') {
			throw new Error("Please specify a valid app environment configuration.");
		}

		if (typeOf(config.surreal) !== 'object') {
			throw new Error("Please set the `surreal` property in your environment config.");
		}

		if (typeOf(config.surreal.ns) !== 'string') {
			throw new Error("Please set the `surreal.ns` property in your environment config as a string.");
		}

		if (typeOf(config.surreal.db) !== 'string') {
			throw new Error("Please set the `surreal.db` property in your environment config as a string.");
		}

		this.conf = { headers: {}, opts: [] };

		this.conf.ns = config.surreal.ns;
		this.conf.db = config.surreal.db;

		this.conf.uri = config.surreal.uri || uri;
		this.conf.url = this.conf.uri + '/rpc';

		this.conf.headers.ID = unid();
		this.conf.headers.NS = this.conf.ns;
		this.conf.headers.DB = this.conf.db;

		this.conf.opts.push("json");
		this.conf.opts.push(`id-${unid()}`);
		this.conf.opts.push(`ns-${this.conf.ns}`);
		this.conf.opts.push(`db-${this.conf.db}`);

	},

});
