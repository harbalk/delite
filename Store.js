/** @module delite/Store */
define([
	"dcl/dcl",
	"requirejs-dplugins/has",
	"decor/Invalidating",
	"requirejs-dplugins/Promise!",
	"decor/ObservableArray",
	"decor/Observable"
], function (dcl, has, Invalidating, Promise, ObservableArray, Observable) {

	/**
	 * Dispatched once the query has been executed and the `renderItems` array
	 * has been initialized with the list of initial render items.
	 * @example
	 * widget.on("query-success", function (evt) {
	 *      console.log("query done, initial renderItems: " + evt.renderItems);
	 * });
	 * @event module:delite/Store#query-success
	 * @property {Object[]} renderItems - The array of initial render items.
	 * @property {boolean} cancelable - Indicates whether the event is cancelable or not.
	 * @property {boolean} bubbles - Indicates whether the given event bubbles up through the DOM or not.
	 */
	
	/**
	 * Mixin for store management that creates render items from store items after
	 * querying the store. The receiving class must extend decor/Evented or delite/Widget.
	 *
	 * Classes extending this mixin automatically create render items that are consumable
	 * from store items after querying the store. This happens each time the `store`, `query` or
	 * `queryOptions` properties are set. If that store is Trackable it will be observed and render items
	 * will be automatically updated, added or deleted based on store notifications.
	 *
	 * @mixin module:delite/Store
	 */
	return dcl(Invalidating, /** @lends module:delite/Store# */{
		/**
		 * The store that contains the items to display.
		 * @member {dstore/Store}
		 * @default null
		 */
		store: null,

		/**
		 * A query filter to apply to the store.
		 * @member {Object}
		 * @default {}
		 */
		query: {},

		/**
		 * A function that processes the collection returned by the store query and returns a new collection
		 * (to sort it, etc...). This processing is applied before potentially tracking the store
		 * for modifications (if Trackable).
		 * Changing this function on the instance will not automatically refresh the class.
		 * Only works when using dstore/Store in store field (do not with ObservableArray)
		 * @default identity function
		 */
		processQueryResult: function (store) { return store; },

		/**
		 * The render items corresponding to the store items for this widget. This is filled from the store and
		 * is not supposed to be modified directly. Initially null. 
		 * @member {Object[]}
		 * @default null
		 */
		renderItems: null,

		/**
		 * Creates a store item based from the widget internal item.
		 * @param {Object} renderItem - The render item.
		 * @returns {Object}
		 */
		renderItemToItem: function (renderItem) {
			return renderItem;
		},

		/**
		 * Returns the widget internal item for a given store item. By default it returns the store
		 * item itself.
		 * @param {Object} item - The store item.
		 * @returns {Object}
		 * @protected
		 */
		itemToRenderItem: function (item) {
			return item;
		},

		/**
		 * This method is called once the query has been executed to initialize the renderItems array
		 * with the list of initial render items.
		 *
		 * This method sets the renderItems property to the render items array passed as parameter. Once
		 * done, it fires a 'query-success' event.
		 * @param {Object[]} renderItems - The array of initial render items to be set in the renderItems property.
		 * @returns {Object[]} the renderItems array.
		 * @protected
		 * @fires module:delite/Store#query-success
		 */
		initItems: function (renderItems) {
			this.renderItems = renderItems;
			this.emit("query-success", { renderItems: renderItems, cancelable: false, bubbles: true });
			return renderItems;
		},

		/**
		 * If the store parameters are invalidated, queries the store, creates the render items and calls initItems() 
		 * when ready. If an error occurs a 'query-error' event will be fired.
		 * @param props
		 * @protected
		 */
		computeProperties: function (props) {
			if ("store" in props || "query" in props) {
				this.queryStoreAndInitItems(this.processQueryResult);
			}
		},

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
			if (this.store != null) {
				var collection;
				this._untrack();
				if (!Array.isArray(this.store)) {
					if (!this.store.filter && this.store instanceof HTMLElement && !this.store.attached) {
						// this might a be a store custom element, wait for it
						this.store.addEventListener("customelement-attached", this._attachedlistener = function () {
							this.queryStoreAndInitItems(this.processQueryResult);
						}.bind(this));
					} else {
						if (this._attachedlistener) {
							this.store.removeEventListener("customelement-attached", this._attachedlistener);
						}
					}
					collection = processQueryResult.call(this, this.store.filter(this.query));
					if (collection.track) {
						// user asked us to observe the store
						collection = this._tracked = collection.track();
						collection.on("add", this._itemAdded.bind(this));
						collection.on("update", this._itemUpdated.bind(this));
						collection.on("delete", this._itemRemoved.bind(this));
						collection.on("refresh", this._refreshHandler.bind(this));
					}
				} else {
					this._itemHandles = [];
					this._observeCallbackArray = this.__observeCallbackArray.bind(this);
					this._observeCallbackItems = this.__observeCallbackItems.bind(this);
					for (var i = 0; i < this.store.length; i++) {
						// affect the callback to the observe function if the item is observable
						this._itemHandles[i] = Observable.observe(this.store[i], this._observeCallbackItems);
					}
					collection = processQueryResult.call(this, this.store.filter(this._isQueried, this));
					this.on("add", function (evt) {
						var i = evt.index - 1;
						while (!this._isQueried(this.store[i])) {
							i--;
						}
						var idx = collection.indexOf(this.store[i]);
						collection.splice(idx + 1, 0, evt.obj);
						this._itemAdded({index: idx + 1, target: evt.obj});
					});
					this.on("delete", function (evt) {
						var idx = collection.indexOf(evt.obj);
						collection.splice(idx, 1);
						this._itemRemoved({previousIndex: idx});
					});
					this.on("update", function (evt) {
						var idx = collection.indexOf(evt.obj);
						if (this._isQueried(evt.obj) && idx >= 0) {
							this._itemUpdated({index: idx, previousIndex: idx, target: evt.obj});
						} else if (this._isQueried(evt.obj) && idx < 0) {
							this.emit("add", evt);
						} else if (!this._isQueried(evt.obj) && idx >= 0) {
							collection.splice(idx, 1);
							this._itemRemoved({previousIndex: idx});
						}
					});
					// affect the callback to the observe function if the array is observable
					this._storeHandle = ObservableArray.observe(this.store, this._observeCallbackArray);
				}
				return this.processCollection(collection);
			} else {
				this.initItems([]);
			}
		},

		/**
		 * Synchronously deliver change records to all listeners registered via `observe()`.
		 */
		deliver: dcl.superCall(function (sup) {
			return function () {
				sup.call();
				if (this._storeHandle) {
					this._storeHandle.deliver();
				}
				if (this._itemHandles) {
					this._observeCallbackItems && Observable.deliverChangeRecords(this._observeCallbackItems);
				}
			};
		}),

		/**
		 * Discard change records for all listeners registered via `observe()`.
		 */
		discardChanges: dcl.superCall(function (sup) {
			return function () {
				sup.call();
				if (this._storeHandle && this._itemHandles) {
					this._beingDiscarded = true;
					this._storeHandle.deliver();
					this._observeCallbackItems && Observable.deliverChangeRecords(this._observeCallbackItems);
					this._beingDiscarded = false;
					return this.store;
				}
			};
		}),

		/**
		 * Called to verify if the item respect the query conditions
		 * @param item
		 * @private
		 */
		_isQueried: function (item) {
			for (var prop in this.query) {
				if (item[prop] !== this.query[prop]) {
					return false;
				}
			}
			return true;
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
							this._itemHandles[changeRecords[i].index].remove();
							this._itemHandles.splice(changeRecords[i].index, 1);
							var evtRemoved = {previousIndex: changeRecords[i].index,
								obj: changeRecords[i].removed[j]};
							if (this._isQueried(evtRemoved.obj, this.query)) {
								this.emit("delete", evtRemoved);
							}
						}
						for (j = 0; j < changeRecords[i].addedCount; j++) {
							var evtAdded = {
								index: changeRecords[i].index + j,
								obj: this.store[changeRecords[i].index + j]
							};
							if (this.renderItems !== null && this.renderItems !== undefined) {
								evtAdded.index = evtAdded.index <= this.renderItems.length ?
									evtAdded.index : this.renderItems.length;
							}
							// affect the callback to the observe function if the item is observable
							this._itemHandles.splice(changeRecords[i].index + j, 0,
								Observable.observe(this.store[changeRecords[i].index + j], this._observeCallbackItems));
							if (this._isQueried(evtAdded.obj, this.query)) {
								this.emit("add", evtAdded);
							}
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
								index: this.store.indexOf(object),
								previousIndex: this.store.indexOf(object),
								obj: object,
								oldValue: changeRecords[i].oldValue,
								name: changeRecords[i].name
							};
							this.emit("update", evtUpdated);
						}
					}
				}
			}
		},

		/**
		 * Called to process the items returned after querying the store.
		 * @param {dstore/Collection} collection - Items to be displayed.
		 * @protected
		 */
		processCollection: function (collection) {
			return this.fetch(collection).then(function (items) {
				return this.initItems(items.map(this.itemToRenderItem.bind(this)));
			}.bind(this), this._queryError.bind(this));
		},

		/**
		 * Called to perform the fetch operation on the collection.
		 * @param {dstore/Collection} collection - Items to be displayed.
		 * @protected
		 */
		fetch: function (collection) {
			if (!Array.isArray(this.store)) {
				return collection.fetch();
			} else {
				return Promise.resolve(collection);
			}
		},

		/**
		 * Called to perform the fetchRange operation on the collection.
		 * @param {dstore/Collection} collection - Items to be displayed.
		 * @protected
		 */
		fetchRange: function (collection, args) {
			if (!Array.isArray(this.store)) {
				return collection.fetchRange(args);
			} else {
				var res = collection.slice(args.start, args.end);
				if (res.length < (args.end - args.start)) {
					var promise;
					var evt = {start: args.start, end: args.end, setPromise: function (pro) {
						promise = pro;
					}};
					this.emit("new-query-asked", evt);
					return promise;
				} else {
					return Promise.resolve(res);
				}
			}
		},

		_queryError: function (error) {
			console.log(error);
			this.emit("query-error", { error: error, cancelable: false, bubbles: true });
		},

		_untrack: function () {
			if (this._tracked) {
				this._tracked.tracking.remove();
				this._tracked = null;
			}
			if (this._storeHandle) {
				this._storeHandle.remove();
			}
			if (this._itemHandles) {
				for (var i = 0; i < this._itemHandles.length; i++) {
					this._itemHandles[i].remove();
				}
			}
		},

		detachedCallback: function () {
			this._untrack();
		},

		destroy: function () {
			this._untrack();
		},

		/**
		 * This method is called when an item is removed from an observable store. The default
		 * implementation actually removes a renderItem from the renderItems array. This can be redefined but
		 * must not be called directly.
		 * @param {number} index - The index of the render item to remove.
		 * @param {Object[]} renderItems - The array of render items to remove the render item from.
		 * @protected
		 */
		itemRemoved: function (index, renderItems) {
			renderItems.splice(index, 1);
		},

		/**
		 * This method is called when an item is added in an observable store. The default
		 * implementation actually adds the renderItem to the renderItems array. This can be redefined but
		 * must not be called directly.
		 * @param {number} index - The index where to add the render item.
		 * @param {Object} renderItem - The render item to be added.
		 * @param {Object[]} renderItems - The array of render items to add the render item to.
		 * @protected
		 */
		itemAdded: function (index, renderItem, renderItems) {
			renderItems.splice(index, 0, renderItem);
		},

		/**
		 * This method is called when an item is updated in an observable store. The default
		 * implementation actually updates the renderItem in the renderItems array. This can be redefined but
		 * must not be called directly.
		 * @param {number} index - The index of the render item to update.
		 * @param {Object} renderItem - The render item data the render item must be updated with.
		 * @param {Object[]} renderItems - The array of render items to render item to be updated is part of.
		 * @protected
		 */
		itemUpdated: function (index, renderItem, renderItems) {
			// we want to keep the same item object and mixin new values into old object
			dcl.mix(renderItems[index], renderItem);
		},

		/**
		 * This method is called when an item is moved in an observable store. The default
		 * implementation actually moves the renderItem in the renderItems array. This can be redefined but
		 * must not be called directly.
		 * @param {number} previousIndex - The previous index of the render item.
		 * @param {number} newIndex - The new index of the render item.
		 * @param {Object} renderItem - The render item to be moved.
		 * @param {Object[]} renderItems - The array of render items to render item to be moved is part of.
		 * @protected
		 */
		itemMoved: function (previousIndex, newIndex, renderItem, renderItems) {
			// we want to keep the same item object and mixin new values into old object
			this.itemRemoved(previousIndex, renderItems);
			this.itemAdded(newIndex, renderItem, renderItems);
		},
		
		_refreshHandler: function () {
			this.queryStoreAndInitItems(this.processQueryResult);
		},

		/**
		 * When the store is observed and an item is removed in the store this method is called to remove the
		 * corresponding render item. This can be redefined but must not be called directly.
		 * @param {Event} event - The "remove" `dstore/Trackable` event.
		 * @private
		 */
		_itemRemoved: function (event) {
			if (event.previousIndex !== undefined) {
				this.itemRemoved(event.previousIndex, this.renderItems);
				// the change of the value of the renderItems property (splice of the array)
				// does not automatically trigger a notification. Hence:
				this.notifyCurrentValue("renderItems");
			}
			// if no previousIndex the items is removed outside of the range we monitor so we don't care
		},

		/**
		 * When the store is observed and an item is updated in the store this method is called to update the
		 * corresponding render item.  This can be redefined but must not be called directly.
		 * @param {Event} event - The "update" `dstore/Trackable` event.
		 * @private
		 */
		_itemUpdated: function (event) {
			if (event.index === undefined) {
				// this is actually a remove
				this.itemRemoved(event.previousIndex, this.renderItems);
			} else if (event.previousIndex === undefined) {
				// this is actually a add
				this.itemAdded(event.index, this.itemToRenderItem(event.target), this.renderItems);
			} else if (event.index !== event.previousIndex) {
				// this is a move
				this.itemMoved(event.previousIndex, event.index, this.itemToRenderItem(event.target), this.renderItems);
			} else {
				// we want to keep the same item object and mixin new values into old object
				this.itemUpdated(event.index, this.itemToRenderItem(event.target), this.renderItems);
			}
			// the change of the value of the renderItems property (splice of the array)
			// does not automatically trigger a notification. Hence:
			this.notifyCurrentValue("renderItems");
		},

		/**
		 * When the store is observed and an item is added in the store this method is called to add the
		 * corresponding render item. This can be redefined but must not be called directly.
		 * @param {Event} event - The "add" `dstore/Trackable` event.
		 * @private
		 */
		_itemAdded: function (event) {
			if (event.index !== undefined) {
				this.itemAdded(event.index, this.itemToRenderItem(event.target), this.renderItems);
				// the change of the value of the renderItems property (splice of the array)
				// does not automatically trigger a notification. Hence:
				this.notifyCurrentValue("renderItems");
			}
			// if no index the item is added outside of the range we monitor so we don't care
		},

		/**
		 * Returns the identity of an item.
		 * @param {Object} item The item
		 * @returns {Object}
		 * @protected
		 */
		getIdentity: function (item) {
			if (!Array.isArray(this.store)) {
				return this.store.getIdentity(item);
			} else {
				return (item.id !== undefined) ? item.id : this.store.indexOf(item);
			}
		}
	});
});
