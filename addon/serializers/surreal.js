import DS from "ember-data";

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
				if (attr.kind == 'hasMany') {
					this.serializeHasMany(snapshot, json, attr);
				}
				if (attr.kind == 'belongsTo') {
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
		return this._super(type, hash);
	},

	normalizeArrayResponse(store, type, records, id, method) {
		return this._super(store, type, records || [], id, method);
	},

	normalizeSingleResponse(store, type, records, id, method) {
		return this._super(store, type, records[0] || {}, id, method);
	},

});
