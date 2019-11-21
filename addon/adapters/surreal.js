import DS from "ember-data";
import { resolve, Promise } from 'rsvp';
import { inject } from '@ember/service';
import { count, table } from "../builders";

export default DS.SurrealAdapter = DS.Adapter.extend({

	surreal: inject(),

	fastboot: inject(),

	defaultSerializer: '-surreal',

	shouldReloadAll() {
		return false;
	},

	shouldReloadRecord() {
		return true;
	},

	shouldBackgroundReloadAll() {
		return true;
	},

	shouldBackgroundReloadRecord() {
		return true;
	},

	findAll(store, type) {
		return this.surreal.select(type.modelName);
	},

	findMany(store, type, ids) {
		return this.surreal.select(type.modelName, ids);
	},

	findRecord(store, type, id) {
		return this.surreal.select(type.modelName, id);
	},

	async createRecord(store, type, snapshot) {
		try {
			return await snapshot.record.get('creater').perform(store, type, snapshot);
		} catch (e) {
			return null;
		}
	},

	async deleteRecord(store, type, snapshot) {
		try {
			return await snapshot.record.get('deleter').perform(store, type, snapshot);
		} catch (e) {
			return null;
		}
	},

	async updateRecord(store, type, snapshot) {
		try {
			return await snapshot.record.get('updater').perform(store, type, snapshot);
		} catch (e) {
			return null;
		}
	},

	queryRecord(store, type, query={}) {

		return new Promise( (resolve, reject) => {

			if (query.id) {
				let cached = this.fastboot.shoebox.retrieve(query.id);
				if (cached) {
					let element = document.getElementById(`shoebox-${query.id}`);
					element && element.parentNode.removeChild(element);
					delete this.fastboot.shoebox[query.id];
					resolve(cached);
					return;
				}
			}

			let { text, vars } = table(type.modelName, query);

			return this.surreal.query(text, vars).then( ([json]) => {

				json.result = json.result || [];

				if (json.status === "OK") {
					if (json.result[0]) {
						if (this.fastboot.isFastBoot && query.id) {
							this.fastboot.shoebox.put(query.id, json.result[0]);
						}
						resolve(json.result[0]);
					} else {
						reject(json);
					}
				} else {
					reject(json);
				}

			});

		});

	},

	count(store, type, query={}) {

		if (query.count !== true) return resolve();

		return new Promise( (resolve/*, reject*/) => {

			let { text, vars } = count(type.modelName, query);

			return this.surreal.query(text, vars).then( ([json]) => {

				json.result = json.result || [];

				if (json.status === "OK") {
					if (json.result[0]) {
						resolve({ total: json.result[0].count })
					} else {
						resolve({ total: 0 })
					}
				} else {
					resolve();
				}

			});

		});

	},

	query(store, type, query={}) {

		return new Promise( (resolve, reject) => {

			if (query.id) {
				let cached = this.fastboot.shoebox.retrieve(query.id);
				if (cached) {
					let element = document.getElementById(`shoebox-${query.id}`);
					element && element.parentNode.removeChild(element);
					delete this.fastboot.shoebox[query.id];
					resolve(cached);
					return;
				}
			}

			return this.count(store, type, query).then(meta => {

				let { text, vars } = table(type.modelName, query);

				return this.surreal.query(text, vars).then( ([json]) => {

					json.result = json.result || [];

					if (json.status === "OK") {
						if (this.fastboot.isFastBoot && query.id) {
							this.fastboot.shoebox.put(query.id, json.result);
						}
						json.result.meta = meta;
						resolve(json.result);
					} else {
						reject(json);
					}

				});

			});

		});

	},

});
