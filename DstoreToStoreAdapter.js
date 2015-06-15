define([
	"dcl/dcl"
], function (dcl) {

	return dcl(null, {
		constructor: dcl.after(function (args) {
			if (args.length) {
				this.mix(args[0]);
			}
		}),

		mix: function (hash) {
			for (var x in hash) {
				if (hash.hasOwnProperty(x)) {
					this[x] = hash[x];
				}
			}
		},

		/**
		 * The store that created this WrapObservable object.
		 * @member {delite/Store}
		 * @default null
		 */
		store: null,

		/**
		 * Queries the store, creates the render items and calls initItems() when ready. If an error occurs
		 * a 'query-error' event will be fired.
		 *
		 * This method is not supposed to be called by application developer.
		 * It will be called automatically when modifying the store related properties or by the subclass
		 * if needed.
		 * @param processQueryResult - A function that processes the collection returned by the store query
		 * and returns a new collection (to sort it, etc...)., applied before tracking.
		 * @returns {Promise} If store to be processed is not null a promise that will be resolved when the loading
		 * process will be finished.
		 * @protected
		 */
		queryStoreAndInitItems: function (processQueryResult) {
			this._untrack();
			var dstore = this.store.store;
			if (dstore != null) {
				if (!dstore.filter && dstore instanceof HTMLElement && !dstore.attached) {
					// this might a be a store custom element, wait for it
					dstore.addEventListener("customelement-attached", this.store._attachedlistener = function () {
						this.queryStoreAndInitItems(this.store.processQueryResult);
					}.bind(this));
				} else {
					if (this.store._attachedlistener) {
						dstore.removeEventListener("customelement-attached", this.store._attachedlistener);
					}
				}
				var collection = processQueryResult.call(this.store, dstore.filter(this.store.query));
				if (collection.track) {
					// user asked us to observe the store
					collection = this.store._tracked = collection.track();
					collection.on("add", this.store._itemAdded.bind(this.store));
					collection.on("update", this.store._itemUpdated.bind(this.store));
					collection.on("delete", this.store._itemRemoved.bind(this.store));
					collection.on("refresh", this.store._refreshHandler.bind(this.store));
				}
				return this.store.processCollection(collection);
			} else {
				this.store.initItems([]);
			}
		},

		_untrack: function () {
			if (this.store._tracked) {
				this.store._tracked.tracking.remove();
				this.store._tracked = null;
			}
		},

		/**
		 * Set the identity of an object
		 */
		_setIdentity: function (item, id) {
			this.store.store._setIdentity(item, id);
		},

		/**
		 * Retrieves an object in the data by its identity
		 */
		get: function (id) {
			return this.store.store.get(id);
		},

		/**
		 * Returns the identity of an item.
		 * @param {Object} item The item
		 * @returns {Object}
		 * @protected
		 */
		getIdentity: function (item) {
			return this.store.store.getIdentity(item);
		}
	});
});
