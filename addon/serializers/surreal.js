import DS from 'ember-data';
import { get } from '@ember/object';

export default DS.SurrealSerializer = DS.JSONSerializer.extend({

	serialize(snapshot) {

		let json = {};

		json.id = snapshot.id;

		snapshot.eachAttribute( (key, attr) => {
			if (!attr.options.readOnly) {
				this.serializeAttribute(snapshot, json, key, attr);
			}
		});

		snapshot.eachRelationship( (key, attr) => {
			if (!attr.options.readOnly) {
				if (attr.kind === 'hasMany') {
					this.serializeHasMany(snapshot, json, attr);
				}
				if (attr.kind === 'belongsTo') {
					this.serializeBelongsTo(snapshot, json, attr);
				}
			}
		});

		return json;

	},

	serializeHasMany(snapshot, json, relationship) {
		let key = this.keyForRelationship(relationship.key, "hasMany", "serialize");
		json[key] = snapshot.hasMany(key, { ids: true });
	},

	serializeBelongsTo(snapshot, json, relationship) {
		let key = this.keyForRelationship(relationship.key, "belongsTo", "serialize");
		json[key] = snapshot.belongsTo(key, { id: true });
	},

	extractMeta(store, type, payload) {

		if (payload && payload.meta) {
			// Don't delete meta from payload!
			return payload.meta;
		}

		return null;

	},

	normalize(type, hash) {

		if (hash && hash.meta) {
			hash.type = hash.meta.tb;
		}

		let data = this._super(type, hash);

		return this.extractEmbeddedRecords(this.store, type, data);

	},

	normalizeArrayResponse(store, type, data, id, method) {
		return this._super(store, type, data || [], id, method);
	},

	normalizeSingleResponse(store, type, data, id, method) {
		return this._super(store, type, data || {}, id, method);
	},

	normalizeEmbeddedRelationship(store, attr, data) {

		let modelName = attr.type;

		if (attr.options.polymorphic) {
			modelName = data.type;
		}

		let modelClass = store.modelFor(modelName);
		let serializer = store.serializerFor(modelName);

		return serializer.normalize(modelClass, data, null);

	},

	extractEmbeddedRecords(store, type, hash) {

		hash.included = hash.included || [];

		type.eachRelationship( (key, attr) => {
			if (attr.kind === "hasMany") {
				this.extractEmbeddedHasMany(store, key, hash, attr);
			}
			if (attr.kind === "belongsTo") {
				this.extractEmbeddedBelongsTo(store, key, hash, attr);
			}
		});

		return hash;

	},

	extractEmbeddedHasMany(store, key, hash, attr) {

		let items = get(hash, `data.relationships.${key}.data`);

		if (!items) return;

		for (let i = 0; i < items.length; i++) {

			items[i] = this.extractEmbeddedRecord(store, attr, hash, items[i]);

		}

	},

	extractEmbeddedBelongsTo(store, key, hash, attr) {

		let item = get(hash, `data.relationships.${key}.data`);

		if (!item) return;

		item = this.extractEmbeddedRecord(store, attr, hash, item);

	},

	extractEmbeddedRecord(store, attr, hash, item) {

		if ( Object.keys(item).length === 2 ) {
			if (item.id && item.type) {
				return item;
			}
		}

		let { data, included } = this.normalizeEmbeddedRelationship(store, attr, item);

		hash.included.push(data);

		if (included) {
			hash.included.push(...included);
		}

		return { id: data.id, type: data.type };

	},

});
