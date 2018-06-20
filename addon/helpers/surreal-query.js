import { inject as service } from '@ember/service';
import { observer } from '@ember/object';
import { A } from '@ember/array';
import Helper from '@ember/component/helper';

export default Helper.extend({

	content: A(),

	surreal: service(),

	compute([text], vars) {

		this.set('text', text);
		this.set('vars', vars);

		return this.get('content');

	},

	changed: observer('content', function() {
		this.recompute();
	}),

	paramsDidChange: observer('text', function() {

		let text = this.get('text');
		let vars = this.get('vars');

		this.set('content', []);

		this.get('surreal').query(text, vars).then( (json) => {
			this.set('content', json);
		});

	}),

});

