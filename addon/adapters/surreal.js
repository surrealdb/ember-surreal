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
		return this.get('surreal').select(type.modelName);
	},

	findMany(store, type, ids) {
		return this.get('surreal').select(type.modelName, ids);
	},

	findRecord(store, type, id) {
		return this.get('surreal').select(type.modelName, id);
	},

	createRecord(store, type, snapshot) {
		let data = store.serializerFor(type.modelName).serialize(snapshot);
		return this.get('surreal').create(type.modelName, snapshot.id, data);
	},

	updateRecord(store, type, snapshot) {
		let data = store.serializerFor(type.modelName).serialize(snapshot);
		return this.get('surreal').change(type.modelName, snapshot.id, data);
	},

	deleteRecord(store, type, snapshot) {
		return this.get('surreal').delete(type.modelName, snapshot.id);
	},

	queryRecord(store, type, query={}) {

		return new Promise( (resolve, reject) => {

			let { text, vars } = table(type.modelName, query);

			return this.get('surreal').query(text, vars).then( ([json]) => {

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

			return this.get('surreal').query(text, vars).then( ([json]) => {

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

				return this.get('surreal').query(text, vars).then( ([json]) => {

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
