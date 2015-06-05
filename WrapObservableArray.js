define([
	"dcl/dcl",
	"decor/Evented",
	"requirejs-dplugins/Promise!"
], function (dcl, Evented, Promise) {

	return dcl(Evented, {

		data: null,

		store: null,

		_setIdentity: function (item, id) {
			item.id = id;
		},

		get: function (id) {
			var res = this.data[0];
			var	i = 1;
			while (res.id !== id) {
				res = this.data[i];
				i++;
			}
			return Promise.resolve(res);
		},

		getIdentity: function (item) {
			return item.id !== undefined ? item.id : this.data.indexOf(item);
		},

		fetch: function () {
			return Promise.resolve(this.data);
		},

		fetchRange: function (args) {
			var res = this.data.slice(args.start, args.end);
			if (res.length < (args.end - args.start)) {
				var promise = new Promise(function (resolve) {
					var evt = {start: args.start, end: args.end, resol: resolve}
					this.store.emit("new-query-asked", evt);
				}.bind(this));
				return promise;
			} else {
				return Promise.resolve(res);
			}
		}
	});
});
