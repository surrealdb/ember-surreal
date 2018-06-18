import Helper from '@ember/component/helper';
import Saver from '../objects/autosaver';

export default Helper.extend({
	compute([content]) {
		return Saver.create({
			content
		});
	},
});

