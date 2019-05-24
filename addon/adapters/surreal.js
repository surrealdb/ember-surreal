import DS from "ember-data";
import { resolve, Promise } from 'rsvp';
import { inject } from '@ember/service';
import { count, table } from "../builders";

export default DS.SurrealAdapter = DS.Adapter.extend({

	surreal: inject(),

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

	createRecord(store, type, snapshot) {
		// This returns the promise (success / failue)
		return snapshot.record.get('creater').perform(store, type, snapshot);
	},

	deleteRecord(store, type, snapshot) {
		// This returns the promise (success / failue)
		return snapshot.record.get('deleter').perform(store, type, snapshot);
	},

	updateRecord(store, type, snapshot) {
		// No promise returned, as the item is diffed
		snapshot.record.get('updater').perform(store, type, snapshot);
	},

	queryRecord(store, type, query={}) {

		return new Promise( (resolve, reject) => {

			let { text, vars } = table(type.modelName, query);

			return this.surreal.query(text, vars).then( ([json]) => {

				json.result = json.result || [];

				if (json.status === "OK") {
					if (json.result[0]) {
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

			return this.count(store, type, query).then(meta => {

				let { text, vars } = table(type.modelName, query);

				return this.surreal.query(text, vars).then( ([json]) => {

					json.result = json.result || [];

					if (json.status === "OK") {
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
