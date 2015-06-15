define([
	"dcl/dcl",
	"decor/Evented",
	"decor/ObservableArray",
	"decor/Observable",
	"requirejs-dplugins/Promise!"
], function (dcl, Evented, ObservableArray, Observable, Promise) {

	return dcl(Evented, {
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
		 * Array that contains the items to display.
		 * @member {Array}
		 * @default null
		 */
		data: null,

		/**
		 * The store that have created this WrapObservable object.
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
			var array = this.store.store;
			if (array != null) {
				this.store._itemHandles = [];
				this._observeCallbackArray = this.__observeCallbackArray.bind(this);
				this._observeCallbackItems = this.__observeCallbackItems.bind(this);
				for (var i = 0; i < array.length; i++) {
					// affect the callback to the observe function if the item is observable
					this.store._itemHandles[i] = Observable.observe(array[i], this._observeCallbackItems);
				}
				// affect the callback to the observe function if the array is observable
				this.store._storeHandle = ObservableArray.observe(array, this._observeCallbackArray);

				this.data = processQueryResult.call(this.store, array.filter(this._isQueried, this));
				var collection = this;
				this.store._addListener = collection.on("add", function (evt) {
					var i = evt.index - 1;
					while (!this._isQueried(array[i])) {
						i--;
					}
					var idx = collection.data.indexOf(array[i]);
					collection.data.splice(idx + 1, 0, evt.obj);
					this.store._itemAdded({index: idx + 1, target: evt.obj});
				}.bind(this));
				this.store._deleteListener = collection.on("delete", function (evt) {
					var idx = collection.data.indexOf(evt.obj);
					collection.data.splice(idx, 1);
					this.store._itemRemoved({previousIndex: idx});
				}.bind(this));
				this.store._updateListener = collection.on("update", function (evt) {
					var idx = collection.data.indexOf(evt.obj);
					if (this._isQueried(evt.obj) && idx >= 0) {
						this.store._itemUpdated({index: idx, previousIndex: idx, target: evt.obj});
					} else if (this._isQueried(evt.obj) && idx < 0) {
						this.emit("add", evt);
					} else if (!this._isQueried(evt.obj) && idx >= 0) {
						collection.data.splice(idx, 1);
						this.store._itemRemoved({previousIndex: idx});
					}
				}.bind(this));
				return this.store.processCollection(collection);
			} else {
				this.store.initItems([]);
			}
		},

		/**
		 * Called when a modification is done on the array.
		 * @param changeRecords - send by the Observe function
		 */
		__observeCallbackArray: function (changeRecords) {
			if (!this._beingDiscarded) {
				for (var i = 0; i < changeRecords.length; i++) {
					if (changeRecords[i].type === "splice") {
						var j;
						for (j = 0; j < changeRecords[i].removed.length; j++) {
							this.store._itemHandles[changeRecords[i].index].remove();
							this.store._itemHandles.splice(changeRecords[i].index, 1);
							var evtRemoved = {previousIndex: changeRecords[i].index,
								obj: changeRecords[i].removed[j]};
							if (this._isQueried(evtRemoved.obj)) {
								this.emit("delete", evtRemoved);
							}
							this.store.emit("db-delete", evtRemoved);
						}
						for (j = 0; j < changeRecords[i].addedCount; j++) {
							var evtAdded = {
								index: changeRecords[i].index + j,
								obj: this.store.store[changeRecords[i].index + j]
							};
							if (this.renderItems !== null && this.renderItems !== undefined) {
								evtAdded.index = evtAdded.index <= this.renderItems.length ?
									evtAdded.index : this.renderItems.length;
							}
							// affect the callback to the observe function if the item is observable
							this.store._itemHandles.splice(changeRecords[i].index + j, 0,
								Observable.observe(
									this.store.store[changeRecords[i].index + j], this._observeCallbackItems)
							);
							if (this._isQueried(evtAdded.obj)) {
								this.emit("add", evtAdded);
							}
							this.store.emit("db-add", evtAdded);
						}
					}
				}
			}
		},

		/**
		 * Called when a modification is done on the items.
		 * @param changeRecords - send by the Observe function
		 */
		__observeCallbackItems: function (changeRecords) {
			if (!this._beingDiscarded) {
				var objects = [];
				for (var i = 0; i < changeRecords.length; i++) {
					var object = changeRecords[i].object;
					if (objects.indexOf(object) < 0) {
						objects.push(object);
						if (changeRecords[i].type === "add" || changeRecords[i].type === "update" ||
							changeRecords[i].type === "delete" || changeRecords[i].type === "splice") {
							var evtUpdated = {
								index: this.store.store.indexOf(object),
								previousIndex: this.store.store.indexOf(object),
								obj: object,
								oldValue: changeRecords[i].oldValue,
								name: changeRecords[i].name
							};
							this.emit("update", evtUpdated);
							this.store.emit("db-update", evtUpdated);
						}
					}
				}
			}
		},

		/**
		 * Called to verify if the item respect the query conditions
		 * @param item
		 * @private
		 */
		_isQueried: function (item) {
			for (var prop in this.store.query) {
				if (item[prop] !== this.store.query[prop]) {
					return false;
				}
			}
			return true;
		},

		/**
		 * Called to perform the fetch operation on the collection.
		 * @protected
		 */
		fetch: function () {
			return Promise.resolve(this.data);
		},

		/**
		 * Called to perform the fetchRange operation on the collection.
		 * @param {args} - contains the start index and the end index of the fetch
		 * @protected
		 */
		fetchRange: function (args) {
			var res = this.data.slice(args.start, args.end);
			if (res.length < (args.end - args.start)) {
				var promise;
				var evt = {start: args.start, end: args.end, resLength: res.length, setPromise: function (pro) {
					promise = pro;
				}};
				this.store.emit("new-query-asked", evt);
				return promise;
			} else {
				return Promise.resolve(res);
			}
		},

		/**
		 * Synchronously deliver change records to all listeners registered via `observe()`.
		 */
		deliver:  function () {
			if (this.store._storeHandle) {
				this.store._storeHandle.deliver();
			}
			if (this.store._itemHandles) {
				this._observeCallbackItems && Observable.deliverChangeRecords(this._observeCallbackItems);
			}
		},

		/**
		 * Discard change records for all listeners registered via `observe()`.
		 */
		discardChanges: function () {
			if (this.store._storeHandle && this.store._itemHandles) {
				this._beingDiscarded = true;
				this.store._storeHandle.deliver();
				this._observeCallbackItems && Observable.deliverChangeRecords(this._observeCallbackItems);
				this._beingDiscarded = false;
				return this.store;
			}
		},

		_untrack: function () {
			if (this.store._storeHandle) {
				this.store._storeHandle.remove();
			}
			if (this.store._itemHandles) {
				for (var i = 0; i < this.store._itemHandles.length; i++) {
					this.store._itemHandles[i].remove();
				}
			}
			if (this.store._addListener) {
				this.store._addListener.remove(this.store._addListener);
			}
			if (this.store._deleteListener) {
				this.store._deleteListener.remove(this.store._deleteListener);
			}
			if (this.store._updateListener) {
				this.store._updateListener.remove(this.store._updateListener);
			}
		},

		/**
		 * Set the identity of an object
		 */
		_setIdentity: function (item, id) {
			item.id = id;
		},

		/**
		 * Retrieves an object in the data by its identity
		 */
		get: function (id) {
			var res = this.data[0];
			var	i = 1;
			while (res.id !== id) {
				res = this.data[i];
				i++;
			}
			return Promise.resolve(res);
		},

		/**
		 * Returns the identity of an item.
		 * @param {Object} item The item
		 * @returns {Object}
		 * @protected
		 */
		getIdentity: function (item) {
			return item.id !== undefined ? item.id : this.data.indexOf(item);
		}
	});
});
