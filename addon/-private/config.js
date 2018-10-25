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

		if (config.surreal.uri === 'self') {
			config.surreal.uri = window.location.origin;
		}

		this.config = { headers: {}, opts: [] };

		this.config.ns = config.surreal.ns;
		this.config.db = config.surreal.db;

		this.config.uri = config.surreal.uri || uri;
		this.config.url = this.config.uri + '/rpc';

		this.config.headers.ID = unid();
		this.config.headers.NS = this.config.ns;
		this.config.headers.DB = this.config.db;

		this.config.opts.push("json");
		this.config.opts.push(`id-${unid()}`);
		this.config.opts.push(`ns-${this.config.ns}`);
		this.config.opts.push(`db-${this.config.db}`);

	},

});
