import Ember from 'ember';
import DS from 'ember-data';
import ModelPlugin from '../-private/model';
import StorePlugin from '../-private/store';
import SurrealAdapter from '../adapters/surreal';
import SurrealSerializer from '../serializers/surreal';

Ember.libraries.register("Surreal", "0.1.0");

export default function(application) {

	application.inject('model', 'surreal', 'service:surreal');
	application.inject('route', 'surreal', 'service:surreal');
	application.inject('controller', 'surreal', 'service:surreal');
	application.inject('component', 'surreal', 'service:surreal');

	application.register('adapter:-surreal', SurrealAdapter);
	application.register('serializer:-surreal', SurrealSerializer);

	if (!DS.Model.prototype._surrealPatched) {
		DS.Model.reopen(ModelPlugin, {
			_surrealPatched: true,
		});
	}

	if (!DS.Store.prototype._surrealPatched) {
		DS.Store.reopen(StorePlugin, {
			_surrealPatched: true,
		});
	}

}
