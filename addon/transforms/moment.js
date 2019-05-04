import DS from 'ember-data';
import Moment from 'moment';

export default DS.Transform.extend({

	deserialize(value) {
		return (value && Moment) ? Moment.utc(value) : value;
	},

	serialize(value) {
		return (value && Moment) ? Moment.utc(value).toJSON() : value;
	},

});
