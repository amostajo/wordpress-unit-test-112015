/* global _wpThemeSettings, confirm */
window.wp = window.wp || {};

( function($) {

// Set up our namespace...
var themes, l10n;
themes = wp.themes = wp.themes || {};

// Store the theme data and settings for organized and quick access
// themes.data.settings, themes.data.themes, themes.data.l10n
themes.data = _wpThemeSettings;
l10n = themes.data.l10n;

// Shortcut for isInstall check
themes.isInstall = !! themes.data.settings.isInstall;

// Setup app structure
_.extend( themes, { model: {}, view: {}, routes: {}, router: {}, template: wp.template });

themes.Model = Backbone.Model.extend({
	// Adds attributes to the default data coming through the .org themes api
	// Map `id` to `slug` for shared code
	initialize: function() {
		var install, preview;

		// Install url for the theme
		// using the install nonce
		install = {
			action: 'install-theme',
			theme: this.get( 'slug' ),
			_wpnonce: themes.data.settings._nonceInstall
		};

		// Build the url query
		install = themes.data.settings.updateURI + '?' + $.param( install );

		// Preview url for the theme
		preview = {
			tab: 'theme-information',
			theme: this.get( 'slug' )
		};

		preview = themes.data.settings.installURI + '?' + $.param( preview );

		// Set the attributes
		this.set({
			installURI: install,
			previewURI: preview,
			// slug is for installation, id is for existing.
			id: this.get( 'slug' ) || this.get( 'id' )
		});
	}
});

// Main view controller for themes.php
// Unifies and renders all available views
themes.view.Appearance = wp.Backbone.View.extend({

	el: '#wpbody-content .wrap .theme-browser',

	window: $( window ),
	// Pagination instance
	page: 0,

	// Sets up a throttler for binding to 'scroll'
	initialize: function( options ) {
		// Scroller checks how far the scroll position is
		_.bindAll( this, 'scroller' );

		this.SearchView = options.SearchView ? options.SearchView : themes.view.Search;
		// Bind to the scroll event and throttle
		// the results from this.scroller
		this.window.bind( 'scroll', _.throttle( this.scroller, 300 ) );
	},

	// Main render control
	render: function() {
		// Setup the main theme view
		// with the current theme collection
		this.view = new themes.view.Themes({
			collection: this.collection,
			parent: this
		});

		// Render search form.
		this.search();

		// Render and append
		this.view.render();
		this.$el.empty().append( this.view.el ).addClass('rendered');
		this.$el.append( '<br class="clear"/>' );
	},

	// Defines search element container
	searchContainer: $( '#wpbody h2:first' ),

	// Search input and view
	// for current theme collection
	search: function() {
		var view,
			self = this;

		// Don't render the search if there is only one theme
		if ( themes.data.themes.length === 1 ) {
			return;
		}

		view = new this.SearchView({
			collection: self.collection,
			parent: this
		});

		// Render and append after screen title
		view.render();
		this.searchContainer
			.append( $.parseHTML( '<label class="screen-reader-text" for="theme-search-input">' + l10n.search + '</label>' ) )
			.append( view.el );
	},

	// Checks when the user gets close to the bottom
	// of the mage and triggers a theme:scroll event
	scroller: function() {
		var self = this,
			bottom, threshold;

		bottom = this.window.scrollTop() + self.window.height();
		threshold = self.$el.offset().top + self.$el.outerHeight( false ) - self.window.height();
		threshold = Math.round( threshold * 0.9 );

		if ( bottom > threshold ) {
			this.trigger( 'theme:scroll' );
		}
	}
});

// Set up the Collection for our theme data
// @has 'id' 'name' 'screenshot' 'author' 'authorURI' 'version' 'active' ...
themes.Collection = Backbone.Collection.extend({

	model: themes.Model,

	// Search terms
	terms: '',

	// Controls searching on the current theme collection
	// and triggers an update event
	doSearch: function( value ) {

		// Don't do anything if we've already done this search
		// Useful because the Search handler fires multiple times per keystroke
		if ( this.terms === value ) {
			return;
		}

		// Updates terms with the value passed
		this.terms = value;

		// If we have terms, run a search...
		if ( this.terms.length > 0 ) {
			this.search( this.terms );
		}

		// If search is blank, show all themes
		// Useful for resetting the views when you clean the input
		if ( this.terms === '' ) {
			this.reset( themes.data.themes );
		}

		// Trigger an 'update' event
		this.trigger( 'update' );
	},

	// Performs a search within the collection
	// @uses RegExp
	search: function( term ) {
		var match, results, haystack;

		// Start with a full collection
		this.reset( themes.data.themes, { silent: true } );

		// Escape the term string for RegExp meta characters
		term = term.replace( /[-\/\\^$*+?.()|[\]{}]/g, '\\$&' );

		// Consider spaces as word delimiters and match the whole string
		// so matching terms can be combined
		term = term.replace( / /g, ')(?=.*' );
		match = new RegExp( '^(?=.*' + term + ').+', 'i' );

		// Find results
		// _.filter and .test
		results = this.filter( function( data ) {
			haystack = _.union( data.get( 'name' ), data.get( 'id' ), data.get( 'description' ), data.get( 'author' ), data.get( 'tags' ) );

			if ( match.test( data.get( 'author' ) ) && term.length > 2 ) {
				data.set( 'displayAuthor', true );
			}

			return match.test( haystack );
		});

		this.reset( results );
	},

	// Paginates the collection with a helper method
	// that slices the collection
	paginate: function( instance ) {
		var collection = this;
		instance = instance || 0;

		// Themes per instance are set at 20
		collection = _( collection.rest( 20 * instance ) );
		collection = _( collection.first( 20 ) );

		return collection;
	},

	count: false,

	// Handles requests for more themes
	// and caches results
	//
	// When we are missing a cache object we fire an apiCall()
	// which triggers events of `query:success` or `query:fail`
	query: function( request ) {
		/**
		 * @static
		 * @type Array
		 */
		var queries = this.queries,
			self = this,
			query, isPaginated, count;

		// Store current query request args
		// for later use with the event `theme:end`
		this.currentQuery.request = request;

		// Search the query cache for matches.
		query = _.find( queries, function( query ) {
			return _.isEqual( query.request, request );
		});

		// If the request matches the stored currentQuery.request
		// it means we have a paginated request.
		isPaginated = _.has( request, 'page' );

		// Reset the internal api page counter for non paginated queries.
		if ( ! isPaginated ) {
			this.currentQuery.page = 1;
		}

		// Otherwise, send a new API call and add it to the cache.
		if ( ! query && ! isPaginated ) {
			query = this.apiCall( request ).done( function( data ) {
				// Update the collection with the queried data.
				self.reset( data.themes );
				count = data.info.results;

				// Trigger a collection refresh event
				// and a `query:success` event with a `count` argument.
				self.trigger( 'update' );
				self.trigger( 'query:success', count );

				if ( data.themes.length === 0 ) {
					self.trigger( 'query:empty' );
				}

				// Store the results and the query request
				queries.push( { themes: data.themes, request: request, total: count } );
			}).fail( function() {
				self.trigger( 'query:fail' );
			});
		} else {
			// If it's a paginated request we need to fetch more themes...
			if ( isPaginated ) {
				return this.apiCall( request, isPaginated ).done( function( data ) {
					// Add the new themes to the current collection
					// @todo update counter
					self.add( data.themes );
					self.trigger( 'query:success' );

					// We are done loading themes for now.
					self.loadingThemes = false;

				}).fail( function() {
					self.trigger( 'query:fail' );
				});
			}

			if ( query.themes.length === 0 ) {
				self.trigger( 'query:empty' );
			} else {
				$( 'body' ).removeClass( 'no-results' );
			}

			// Only trigger an update event since we already have the themes
			// on our cached object
			if ( _.isNumber( query.total ) ) {
				this.count = query.total;
			}

			if ( ! query.total ) {
				this.count = this.length;
			}

			this.reset( query.themes );
			this.trigger( 'update' );
		}
	},

	// Local cache array for API queries
	queries: [],

	// Keep track of current query so we can handle pagination
	currentQuery: {
		page: 1,
		request: {}
	},

	// Send Ajax POST request to api.wordpress.org/themes
	apiCall: function( request, paginated ) {

		// Ajax request to .org API
		return $.ajax({
			url: 'https://api.wordpress.org/themes/info/1.1/?action=query_themes',

			// We want JSON data
			dataType: 'json',
			type: 'POST',
			crossDomain: true,

			// Request data
			data: {
				action: 'query_themes',
				request: _.extend({
					per_page: 72,
					fields: {
						description: true,
						tested: true,
						requires: true,
						rating: true,
						downloaded: true,
						downloadLink: true,
						last_updated: true,
						homepage: true,
						num_ratings: true
					}
				}, request)
			},

			beforeSend: function() {
				if ( ! paginated ) {
					// Spin it
					$( 'body' ).addClass( 'loading-themes' ).removeClass( 'no-results' );
				}
			}
		});
	},

	// Static status controller for when we are loading themes.
	loadingThemes: false
});

// This is the view that controls each theme item
// that will be displayed on the screen
themes.view.Theme = wp.Backbone.View.extend({

	// Wrap theme data on a div.theme element
	className: 'theme',

	// Reflects which theme view we have
	// 'grid' (default) or 'detail'
	state: 'grid',

	// The HTML template for each element to be rendered
	html: themes.template( 'theme' ),

	events: {
		'click': themes.isInstall ? 'preview': 'expand',
		'click .preview': 'preview',
		'keydown': themes.isInstall ? 'preview': 'expand',
		'touchend': themes.isInstall ? 'preview': 'expand',
		'keyup': 'addFocus',
		'touchmove': 'preventExpand'
	},

	touchDrag: false,

	render: function() {
		var data = this.model.toJSON();
		// Render themes using the html template
		this.$el.html( this.html( data ) ).attr({
			tabindex: 0,
			'aria-describedby' : data.id + '-action ' + data.id + '-name'
		});

		// Renders active theme styles
		this.activeTheme();

		if ( this.model.get( 'displayAuthor' ) ) {
			this.$el.addClass( 'display-author' );
		}
	},

	// Adds a class to the currently active theme
	// and to the overlay in detailed view mode
	activeTheme: function() {
		if ( this.model.get( 'active' ) ) {
			this.$el.addClass( 'active' );
		}
	},

	// Add class of focus to the theme we are focused on.
	addFocus: function() {
		var $themeToFocus = ( $( ':focus' ).hasClass( 'theme' ) ) ? $( ':focus' ) : $(':focus').parents('.theme');

		$('.theme.focus').removeClass('focus');
		$themeToFocus.addClass('focus');
	},

	// Single theme overlay screen
	// It's shown when clicking a theme
	expand: function( event ) {
		var self = this;

		event = event || window.event;

		// 'enter' and 'space' keys expand the details view when a theme is :focused
		if ( event.type === 'keydown' && ( event.which !== 13 && event.which !== 32 ) ) {
			return;
		}

		// Bail if the user scrolled on a touch device
		if ( this.touchDrag === true ) {
			return this.touchDrag = false;
		}

		// Prevent the modal from showing when the user clicks
		// one of the direct action buttons
		if ( $( event.target ).is( '.theme-actions a' ) ) {
			return;
		}

		// Set focused theme to current element
		themes.focusedTheme = this.$el;

		this.trigger( 'theme:expand', self.model.cid );
	},

	preventExpand: function() {
		this.touchDrag = true;
	},

	preview: function( event ) {
		var self = this,
			current;

		// Bail if the user scrolled on a touch device
		if ( this.touchDrag === true ) {
			return this.touchDrag = false;
		}

		// 'enter' and 'space' keys expand the details view when a theme is :focused
		if ( event.type === 'keydown' && ( event.which !== 13 && event.which !== 32 ) ) {
			return;
		}

		// pressing enter while focused on the buttons shouldn't open the preview
		if ( event.type === 'keydown' && event.which !== 13 && $( ':focus' ).hasClass( 'button' ) ) {
			return;
		}

		event.preventDefault();

		event = event || window.event;

		// Set focus to current theme.
		themes.focusedTheme = this.$el;

		// Construct a new Preview view.
		var preview = new themes.view.Preview({
			model: this.model
		});

		// Render the view and append it.
		preview.render();
		$( 'div.wrap' ).append( preview.el );

		// Listen to our preview object
		// for `theme:next` and `theme:previous` events.
		this.listenTo( preview, 'theme:next', function() {

			// Keep local track of current theme model.
			current = self.model;

			// If we have ventured away from current model update the current model position.
			if ( ! _.isUndefined( self.current ) ) {
				current = self.current;
			}

			// Get previous theme model.
			self.current = self.model.collection.at( self.model.collection.indexOf( current ) + 1 );

			// If we have no more themes, bail.
			if ( _.isUndefined( self.current ) ) {
				return self.current = current;
			}

			// Construct a new Preview view.
			preview = new themes.view.Preview({
				model: self.current
			});

			// Render and append.
			preview.render();
			$( 'div.wrap' ).append( preview.el );
		})
		.listenTo( preview, 'theme:previous', function() {

			// Keep track of current theme model.
			current = self.model;

			// If we have ventured away from current model update the current model position.
			if ( ! _.isUndefined( self.current ) ) {
				current = self.current;
			}

			// Get previous theme model.
			self.current = self.model.collection.at( self.model.collection.indexOf( current ) - 1 );

			// If we have no more themes, bail.
			if ( _.isUndefined( self.current ) ) {
				return;
			}

			// Construct a new Preview view.
			preview = new themes.view.Preview({
				model: self.current
			});

			// Render and append.
			preview.render();
			$( 'div.wrap' ).append( preview.el );
		});
	}
});

// Theme Details view
// Set ups a modal overlay with the expanded theme data
themes.view.Details = wp.Backbone.View.extend({

	// Wrap theme data on a div.theme element
	className: 'theme-overlay',

	events: {
		'click': 'collapse',
		'click .delete-theme': 'deleteTheme',
		'click .left': 'previousTheme',
		'click .right': 'nextTheme'
	},

	// The HTML template for the theme overlay
	html: themes.template( 'theme-single' ),

	render: function() {
		var data = this.model.toJSON();
		this.$el.html( this.html( data ) );
		// Renders active theme styles
		this.activeTheme();
		// Set up navigation events
		this.navigation();
		// Checks screenshot size
		this.screenshotCheck( this.$el );
		// Contain "tabbing" inside the overlay
		this.containFocus( this.$el );
	},

	// Adds a class to the currently active theme
	// and to the overlay in detailed view mode
	activeTheme: function() {
		// Check the model has the active property
		this.$el.toggleClass( 'active', this.model.get( 'active' ) );
	},

	// Keeps :focus within the theme details elements
	containFocus: function( $el ) {
		var $target;

		// Move focus to the primary action
		_.delay( function() {
			$( '.theme-wrap a.button-primary:visible' ).focus();
		}, 500 );

		$el.on( 'keydown.wp-themes', function( event ) {

			// Tab key
			if ( event.which === 9 ) {
				$target = $( event.target );

				// Keep focus within the overlay by making the last link on theme actions
				// switch focus to button.left on tabbing and vice versa
				if ( $target.is( 'button.left' ) && event.shiftKey ) {
					$el.find( '.theme-actions a:last-child' ).focus();
					event.preventDefault();
				} else if ( $target.is( '.theme-actions a:last-child' ) ) {
					$el.find( 'button.left' ).focus();
					event.preventDefault();
				}
			}
		});
	},

	// Single theme overlay screen
	// It's shown when clicking a theme
	collapse: function( event ) {
		var self = this,
			scroll;

		event = event || window.event;

		// Prevent collapsing detailed view when there is only one theme available
		if ( themes.data.themes.length === 1 ) {
			return;
		}

		// Detect if the click is inside the overlay
		// and don't close it unless the target was
		// the div.back button
		if ( $( event.target ).is( '.theme-backdrop' ) || $( event.target ).is( '.close' ) || event.keyCode === 27 ) {

			// Add a temporary closing class while overlay fades out
			$( 'body' ).addClass( 'closing-overlay' );

			// With a quick fade out animation
			this.$el.fadeOut( 130, function() {
				// Clicking outside the modal box closes the overlay
				$( 'body' ).removeClass( 'closing-overlay' );
				// Handle event cleanup
				self.closeOverlay();

				// Get scroll position to avoid jumping to the top
				scroll = document.body.scrollTop;

				// Clean the url structure
				themes.router.navigate( themes.router.baseUrl( '' ) );

				// Restore scroll position
				document.body.scrollTop = scroll;

				// Return focus to the theme div
				if ( themes.focusedTheme ) {
					themes.focusedTheme.focus();
				}
			});
		}
	},

	// Handles .disabled classes for next/previous buttons
	navigation: function() {

		// Disable Left/Right when at the start or end of the collection
		if ( this.model.cid === this.model.collection.at(0).cid ) {
			this.$el.find( '.left' ).addClass( 'disabled' );
		}
		if ( this.model.cid === this.model.collection.at( this.model.collection.length - 1 ).cid ) {
			this.$el.find( '.right' ).addClass( 'disabled' );
		}
	},

	// Performs the actions to effectively close
	// the theme details overlay
	closeOverlay: function() {
		$( 'body' ).removeClass( 'theme-overlay-open' );
		this.remove();
		this.unbind();
		this.trigger( 'theme:collapse' );
	},

	// Confirmation dialoge for deleting a theme
	deleteTheme: function() {
		return confirm( themes.data.settings.confirmDelete );
	},

	nextTheme: function() {
		var self = this;
		self.trigger( 'theme:next', self.model.cid );
	},

	previousTheme: function() {
		var self = this;
		self.trigger( 'theme:previous', self.model.cid );
	},

	// Checks if the theme screenshot is the old 300px width version
	// and adds a corresponding class if it's true
	screenshotCheck: function( el ) {
		var screenshot, image;

		screenshot = el.find( '.screenshot img' );
		image = new Image();
		image.src = screenshot.attr( 'src' );

		// Width check
		if ( image.width && image.width <= 300 ) {
			el.addClass( 'small-screenshot' );
		}
	}
});

// Theme Preview view
// Set ups a modal overlay with the expanded theme data
themes.view.Preview = themes.view.Details.extend({

	className: 'wp-full-overlay expanded',
	el: '#theme-installer',

	events: {
		'click .close-full-overlay': 'close',
		'click .collapse-sidebar': 'collapse',
		'click .previous-theme': 'previousTheme',
		'click .next-theme': 'nextTheme'
	},

	// The HTML template for the theme preview
	html: themes.template( 'theme-preview' ),

	render: function() {
		var data = this.model.toJSON();
		this.$el.html( this.html( data ) );

		themes.router.navigate( themes.router.baseUrl( '?theme=' + this.model.get( 'id' ) ), { replace: true } );

		this.$el.fadeIn( 200, function() {
			$( 'body' ).addClass( 'theme-installer-active full-overlay-active' );
			$( '.close-full-overlay' ).focus();
		});
	},

	close: function() {
		this.$el.fadeOut( 200, function() {
			$( 'body' ).removeClass( 'theme-installer-active full-overlay-active' );

			// Return focus to the theme div
			if ( themes.focusedTheme ) {
				themes.focusedTheme.focus();
			}
		});

		themes.router.navigate( themes.router.baseUrl( '' ) );
		return false;
	},

	collapse: function() {

		this.$el.toggleClass( 'collapsed' ).toggleClass( 'expanded' );
		return false;
	}
});

// Controls the rendering of div.themes,
// a wrapper that will hold all the theme elements
themes.view.Themes = wp.Backbone.View.extend({

	className: 'themes',
	$overlay: $( 'div.theme-overlay' ),

	// Number to keep track of scroll position
	// while in theme-overlay mode
	index: 0,

	// The theme count element
	count: $( '.theme-count' ),

	initialize: function( options ) {
		var self = this;

		// Set up parent
		this.parent = options.parent;

		// Set current view to [grid]
		this.setView( 'grid' );

		// Move the active theme to the beginning of the collection
		self.currentTheme();

		// When the collection is updated by user input...
		this.listenTo( self.collection, 'update', function() {
			self.parent.page = 0;
			self.currentTheme();
			self.render( this );
		});

		// Update theme count to full result set when available.
		this.listenTo( self.collection, 'query:success', function( count ) {
			if ( _.isNumber( count ) ) {
				self.count.text( count );
			} else {
				self.count.text( self.collection.length );
			}
		});

		this.listenTo( self.collection, 'query:empty', function() {
			$( 'body' ).addClass( 'no-results' );
		});

		this.listenTo( this.parent, 'theme:scroll', function() {
			self.renderThemes( self.parent.page );
		});

		this.listenTo( this.parent, 'theme:close', function() {
			if ( self.overlay ) {
				self.overlay.closeOverlay();
			}
		} );

		// Bind keyboard events.
		$( 'body' ).on( 'keyup', function( event ) {
			if ( ! self.overlay ) {
				return;
			}

			// Pressing the right arrow key fires a theme:next event
			if ( event.keyCode === 39 ) {
				self.overlay.nextTheme();
			}

			// Pressing the left arrow key fires a theme:previous event
			if ( event.keyCode === 37 ) {
				self.overlay.previousTheme();
			}

			// Pressing the escape key fires a theme:collapse event
			if ( event.keyCode === 27 ) {
				self.overlay.collapse( event );
			}
		});
	},

	// Manages rendering of theme pages
	// and keeping theme count in sync
	render: function() {
		// Clear the DOM, please
		this.$el.html( '' );

		// If the user doesn't have switch capabilities
		// or there is only one theme in the collection
		// render the detailed view of the active theme
		if ( themes.data.themes.length === 1 ) {

			// Constructs the view
			this.singleTheme = new themes.view.Details({
				model: this.collection.models[0]
			});

			// Render and apply a 'single-theme' class to our container
			this.singleTheme.render();
			this.$el.addClass( 'single-theme' );
			this.$el.append( this.singleTheme.el );
		}

		// Generate the themes
		// Using page instance
		// While checking the collection has items
		if ( this.options.collection.size() > 0 ) {
			this.renderThemes( this.parent.page );
		}

		// Display a live theme count for the collection
		this.count.text( this.collection.count ? this.collection.count : this.collection.length );
	},

	// Iterates through each instance of the collection
	// and renders each theme module
	renderThemes: function( page ) {
		var self = this;

		self.instance = self.collection.paginate( page );

		// If we have no more themes bail
		if ( self.instance.size() === 0 ) {
			// Fire a no-more-themes event.
			this.parent.trigger( 'theme:end' );
			return;
		}

		// Make sure the add-new stays at the end
		if ( page >= 1 ) {
			$( '.add-new-theme' ).remove();
		}

		// Loop through the themes and setup each theme view
		self.instance.each( function( theme ) {
			self.theme = new themes.view.Theme({
				model: theme
			});

			// Render the views...
			self.theme.render();
			// and append them to div.themes
			self.$el.append( self.theme.el );

			// Binds to theme:expand to show the modal box
			// with the theme details
			self.listenTo( self.theme, 'theme:expand', self.expand, self );
		});

		// 'Add new theme' element shown at the end of the grid
		if ( themes.data.settings.canInstall ) {
			this.$el.append( '<div class="theme add-new-theme"><a href="' + themes.data.settings.installURI + '"><div class="theme-screenshot"><span></span></div><h3 class="theme-name">' + l10n.addNew + '</h3></a></div>' );
		}

		this.parent.page++;
	},

	// Grabs current theme and puts it at the beginning of the collection
	currentTheme: function() {
		var self = this,
			current;

		current = self.collection.findWhere({ active: true });

		// Move the active theme to the beginning of the collection
		if ( current ) {
			self.collection.remove( current );
			self.collection.add( current, { at:0 } );
		}
	},

	// Sets current view
	setView: function( view ) {
		return view;
	},

	// Renders the overlay with the ThemeDetails view
	// Uses the current model data
	expand: function( id ) {
		var self = this;

		// Set the current theme model
		this.model = self.collection.get( id );

		// Trigger a route update for the current model
		themes.router.navigate( themes.router.baseUrl( '?theme=' + this.model.id ) );

		// Sets this.view to 'detail'
		this.setView( 'detail' );
		$( 'body' ).addClass( 'theme-overlay-open' );

		// Set up the theme details view
		this.overlay = new themes.view.Details({
			model: self.model
		});

		this.overlay.render();
		this.$overlay.html( this.overlay.el );

		// Bind to theme:next and theme:previous
		// triggered by the arrow keys
		//
		// Keep track of the current model so we
		// can infer an index position
		this.listenTo( this.overlay, 'theme:next', function() {
			// Renders the next theme on the overlay
			self.next( [ self.model.cid ] );

		})
		.listenTo( this.overlay, 'theme:previous', function() {
			// Renders the previous theme on the overlay
			self.previous( [ self.model.cid ] );
		});
	},

	// This method renders the next theme on the overlay modal
	// based on the current position in the collection
	// @params [model cid]
	next: function( args ) {
		var self = this,
			model, nextModel;

		// Get the current theme
		model = self.collection.get( args[0] );
		// Find the next model within the collection
		nextModel = self.collection.at( self.collection.indexOf( model ) + 1 );

		// Sanity check which also serves as a boundary test
		if ( nextModel !== undefined ) {

			// We have a new theme...
			// Close the overlay
			this.overlay.closeOverlay();

			// Trigger a route update for the current model
			self.theme.trigger( 'theme:expand', nextModel.cid );

		}
	},

	// This method renders the previous theme on the overlay modal
	// based on the current position in the collection
	// @params [model cid]
	previous: function( args ) {
		var self = this,
			model, previousModel;

		// Get the current theme
		model = self.collection.get( args[0] );
		// Find the previous model within the collection
		previousModel = self.collection.at( self.collection.indexOf( model ) - 1 );

		if ( previousModel !== undefined ) {

			// We have a new theme...
			// Close the overlay
			this.overlay.closeOverlay();

			// Trigger a route update for the current model
			self.theme.trigger( 'theme:expand', previousModel.cid );

		}
	}
});

// Search input view controller.
themes.view.Search = wp.Backbone.View.extend({

	tagName: 'input',
	className: 'theme-search',
	id: 'theme-search-input',
	searching: false,

	attributes: {
		placeholder: l10n.searchPlaceholder,
		type: 'search'
	},

	events: {
		'input':  'search',
		'keyup':  'search',
		'change': 'search',
		'search': 'search',
		'blur':   'pushState'
	},

	initialize: function( options ) {

		this.parent = options.parent;

		this.listenTo( this.parent, 'theme:close', function() {
			this.searching = false;
		} );

	},

	// Runs a search on the theme collection.
	search: function( event ) {
		var options = {};

		// Clear on escape.
		if ( event.type === 'keyup' && event.which === 27 ) {
			event.target.value = '';
		}

		// Lose input focus when pressing enter
		if ( event.which === 13 ) {
			this.$el.trigger( 'blur' );
		}

		this.collection.doSearch( event.target.value );

		// if search is initiated and key is not return
		if ( this.searching && event.which !== 13 ) {
			options.replace = true;
		} else {
			this.searching = true;
		}

		// Update the URL hash
		if ( event.target.value ) {
			themes.router.navigate( themes.router.baseUrl( '?search=' + event.target.value ), options );
		} else {
			themes.router.navigate( themes.router.baseUrl( '' ) );
		}
	},

	pushState: function( event ) {
		var url = themes.router.baseUrl( '' );

		if ( event.target.value ) {
			url = themes.router.baseUrl( '?search=' + event.target.value );
		}

		this.searching = false;
		themes.router.navigate( url );

	}
});

// Sets up the routes events for relevant url queries
// Listens to [theme] and [search] params
themes.Router = Backbone.Router.extend({

	routes: {
		'themes.php?theme=:slug': 'theme',
		'themes.php?search=:query': 'search',
		'themes.php?s=:query': 'search',
		'themes.php': 'themes',
		'': 'themes'
	},

	baseUrl: function( url ) {
		return 'themes.php' + url;
	},

	search: function( query ) {
		$( '.theme-search' ).val( query );
	},

	themes: function() {
		$( '.theme-search' ).val( '' );
	}

});

// Execute and setup the application
themes.Run = {
	init: function() {
		// Initializes the blog's theme library view
		// Create a new collection with data
		this.themes = new themes.Collection( themes.data.themes );

		// Set up the view
		this.view = new themes.view.Appearance({
			collection: this.themes
		});

		this.render();
	},

	render: function() {

		// Render results
		this.view.render();
		this.routes();

		Backbone.history.start({
			root: themes.data.settings.adminUrl,
			pushState: true,
			hashChange: false
		});
	},

	routes: function() {
		var self = this;
		// Bind to our global thx object
		// so that the object is available to sub-views
		themes.router = new themes.Router();

		// Handles theme details route event
		themes.router.on( 'route:theme', function( slug ) {
			self.view.view.expand( slug );
		});

		themes.router.on( 'route:themes', function() {
			self.themes.doSearch( '' );
			self.view.trigger( 'theme:close' );
		});

		// Handles search route event
		themes.router.on( 'route:search', function( query ) {
			self.view.trigger( 'theme:close' );
			self.themes.doSearch( query );
		});

		this.extraRoutes();
	},

	extraRoutes: function() {
		return false;
	}
};

// Extend the main Search view
themes.view.InstallerSearch =  themes.view.Search.extend({

	events: {
		'keyup': 'search'
	},

	// Handles Ajax request for searching through themes in public repo
	search: function( event ) {

		// Tabbing or reverse tabbing into the search input shouldn't trigger a search
		if ( event.type === 'keyup' && ( event.which === 9 || event.which === 16 ) ) {
			return;
		}

		this.collection = this.options.parent.view.collection;

		// Clear on escape.
		if ( event.type === 'keyup' && event.which === 27 ) {
			event.target.value = '';
		}

		_.debounce( _.bind( this.doSearch, this ), 300 )( event.target.value );
	},

	doSearch: _.debounce( function( value ) {
		var request = {};

		request.search = value;

		// Intercept an [author] search.
		//
		// If input value starts with `author:` send a request
		// for `author` instead of a regular `search`
		if ( value.substring( 0, 7 ) === 'author:' ) {
			request.search = '';
			request.author = value.slice( 7 );
		}

		// Intercept a [tag] search.
		//
		// If input value starts with `tag:` send a request
		// for `tag` instead of a regular `search`
		if ( value.substring( 0, 4 ) === 'tag:' ) {
			request.search = '';
			request.tag = [ value.slice( 4 ) ];
		}

		$( '.theme-section.current' ).removeClass( 'current' );
		$( 'body' ).removeClass( 'more-filters-opened filters-applied' );

		// Get the themes by sending Ajax POST request to api.wordpress.org/themes
		// or searching the local cache
		this.collection.query( request );
	}, 300 )
});

themes.view.Installer = themes.view.Appearance.extend({

	el: '#wpbody-content .wrap',

	// Register events for sorting and filters in theme-navigation
	events: {
		'click .theme-section': 'onSort',
		'click .theme-filter': 'onFilter',
		'click .more-filters': 'moreFilters',
		'click .apply-filters': 'addFilter',
		'click [type="checkbox"]': 'filtersChecked',
		'click .clear-filters': 'clearFilters',
		'click .feature-name': 'filterSection',
		'click .filtering-by a': 'backToFilters'
	},

	// Handles all the rendering of the public theme directory
	browse: function( section ) {
		var self = this;

		this.collection = new themes.Collection();

		// Bump `collection.currentQuery.page` and request more themes if we hit the end of the page.
		this.listenTo( this, 'theme:end', function() {

			// Make sure we are not already loading
			if ( self.collection.loadingThemes ) {
				return;
			}

			// Set loadingThemes to true and bump page instance of currentQuery.
			self.collection.loadingThemes = true;
			self.collection.currentQuery.page++;

			// Use currentQuery.page to build the themes request.
			_.extend( self.collection.currentQuery.request, { page: self.collection.currentQuery.page } );
			self.collection.query( self.collection.currentQuery.request );
		});

		this.listenTo( this.collection, 'query:success', function() {
			$( 'body' ).removeClass( 'loading-themes' );
			$( '.theme-browser' ).find( 'div.error' ).remove();
		});

		this.listenTo( this.collection, 'query:fail', function() {
			$( '.theme-browser' ).find( 'div.error' ).remove();
			$( '.theme-browser' ).append( '<div class="error"><p>' + l10n.error + '</p></div>' );
		});

		// Create a new collection with the proper theme data
		// for each section
		this.collection.query( { browse: section } );

		if ( this.view ) {
			this.view.remove();
		}

		// Set ups the view and passes the section argument
		this.view = new themes.view.Themes({
			collection: this.collection,
			section: section,
			parent: this
		});

		// Reset pagination every time the install view handler is run
		this.page = 0;

		// Render and append
		this.$el.find( '.themes' ).remove();
		this.view.render();
		this.$el.find( '.theme-browser' ).append( this.view.el ).addClass( 'rendered' );
	},

	// Initial render method
	render: function() {
		this.search();
		this.uploader();
		return this.browse( this.options.section );
	},

	// Sorting navigation
	onSort: function( event ) {
		var $el = $( event.target ),
			sort = $el.data( 'sort' );

		event.preventDefault();

		$( 'body' ).removeClass( 'filters-applied more-filters-opened' );

		// Bail if this is already active
		if ( $el.hasClass( this.activeClass ) ) {
			return;
		}

		this.sort( sort );

		// Trigger a router.naviagte update
		themes.router.navigate( themes.router.baseUrl( '?sort=' + sort ) );
	},

	sort: function( sort ) {
		$( '#theme-search-input' ).val( '' );

		$( '.theme-section, .theme-filter' ).removeClass( this.activeClass );
		$( '[data-sort="' + sort + '"]' ).addClass( this.activeClass );

		this.browse( sort );
	},

	// Filters and Tags
	onFilter: function( event ) {
		var request,
			$el = $( event.target ),
			filter = $el.data( 'filter' );

		// Bail if this is already active
		if ( $el.hasClass( this.activeClass ) ) {
			return;
		}

		$( '.theme-filter, .theme-section' ).removeClass( this.activeClass );
		$el.addClass( this.activeClass );

		if ( ! filter ) {
			return;
		}

		// Construct the filter request
		// using the default values
		filter = _.union( filter, this.filtersChecked() );
		request = { tag: [ filter ] };

		// Get the themes by sending Ajax POST request to api.wordpress.org/themes
		// or searching the local cache
		this.collection.query( request );
	},

	// Clicking on a checkbox triggers a tag request
	addFilter: function( event ) {
		var name,
			tags = this.filtersChecked(),
			request = { tag: tags },
			filteringBy = $( '.filtering-by .tags' );

		if ( event ) {
			event.preventDefault();
		}

		$( 'body' ).addClass( 'filters-applied' );
		$( '.theme-section.current' ).removeClass( 'current' );
		filteringBy.empty();

		_.each( tags, function( tag ) {
			name = $( 'label[for="feature-id-' + tag + '"]' ).text();
			filteringBy.append( '<span class="tag">' + name + '</span>' );
		});

		// Get the themes by sending Ajax POST request to api.wordpress.org/themes
		// or searching the local cache
		this.collection.query( request );
	},

	// Get the checked filters
	// @return {array} of tags or false
	filtersChecked: function() {
		var items = $( '.feature-group' ).find( ':checkbox' ),
			tags = [];

		_.each( items.filter( ':checked' ), function( item ) {
			tags.push( $( item ).prop( 'value' ) );
		});

		// When no filters are checked, restore initial state and return
		if ( tags.length === 0 ) {
			$( '.apply-filters' ).find( 'span' ).text( '' );
			$( '.clear-filters' ).hide();
			$( 'body' ).removeClass( 'filters-applied' );
			return false;
		}

		$( '.apply-filters' ).find( 'span' ).text( tags.length );
		$( '.clear-filters' ).css( 'display', 'inline-block' );

		return tags;
	},

	activeClass: 'current',

	// Overwrite search container class to append search
	// in new location
	searchContainer: $( '.theme-navigation' ),

	uploader: function() {
		$( 'a.upload' ).on( 'click', function() {
			$( 'body' ).addClass( 'show-upload-theme' );
			themes.router.navigate( themes.router.baseUrl( '?upload' ), { replace: true } );
		});
		$( 'a.browse-themes' ).on( 'click', function() {
			$( 'body' ).removeClass( 'show-upload-theme' );
			themes.router.navigate( themes.router.baseUrl( '' ), { replace: true } );
		});
	},

	// Toggle the full filters navigation
	moreFilters: function( event ) {
		event.preventDefault();

		if ( $( 'body' ).hasClass( 'filters-applied' ) ) {
			return this.backToFilters();
		}

		// If the filters section is opened and filters are checked
		// run the relevant query collapsing to filtered-by state
		if ( $( 'body' ).hasClass( 'more-filters-opened' ) && this.filtersChecked() ) {
			return this.addFilter();
		}

		$( 'body' ).toggleClass( 'more-filters-opened' );
	},

	// Expand/collapse each individual filter section
	filterSection: function() {
		$( event.target ).parent().toggleClass( 'open' );
	},

	// Clears all the checked filters
	// @uses filtersChecked()
	clearFilters: function( event ) {
		var items = $( '.feature-group' ).find( ':checkbox' ),
			self = this;

		event.preventDefault();

		_.each( items.filter( ':checked' ), function( item ) {
			$( item ).prop( 'checked', false );
			return self.filtersChecked();
		});
	},

	backToFilters: function() {
		$( 'body' ).removeClass( 'filters-applied' );
	}
});

themes.InstallerRouter = Backbone.Router.extend({
	routes: {
		'theme-install.php?theme=:slug': 'preview',
		'theme-install.php?sort=:sort': 'sort',
		'theme-install.php?upload': 'upload',
		'': 'sort'
	},

	baseUrl: function( url ) {
		return 'theme-install.php' + url;
	}
});


themes.RunInstaller = {

	init: function() {
		// Set up the view
		// Passes the default 'section' as an option
		this.view = new themes.view.Installer({
			section: 'featured',
			SearchView: themes.view.InstallerSearch
		});

		// Render results
		this.render();

	},

	render: function() {

		// Render results
		this.view.render();
		this.routes();

		Backbone.history.start({
			root: themes.data.settings.adminUrl,
			pushState: true,
			hashChange: false
		});
	},

	routes: function() {
		var self = this;
		// Bind to our global thx object
		// so that the object is available to sub-views
		themes.router = new themes.InstallerRouter();

		// Handles theme details route event
		themes.router.on( 'route:theme', function( slug ) {
			self.view.view.expand( slug );
		});

		themes.router.on( 'route:sort', function( sort ) {
			if ( ! sort ) {
				sort = 'featured';
			}
			self.view.sort( sort );
			self.view.trigger( 'theme:close' );
		});

		themes.router.on( 'route:upload', function() {
			$( 'a.upload' ).trigger( 'click' );
		});

		this.extraRoutes();
	},

	extraRoutes: function() {
		return false;
	}
};

// Ready...
$( document ).ready(function() {
	if ( themes.isInstall ) {
		themes.RunInstaller.init();
	} else {
		themes.Run.init();
	}
});

})( jQuery );

// Align theme browser thickbox
var tb_position;
jQuery(document).ready( function($) {
	tb_position = function() {
		var tbWindow = $('#TB_window'),
			width = $(window).width(),
			H = $(window).height(),
			W = ( 1040 < width ) ? 1040 : width,
			adminbar_height = 0;

		if ( $('#wpadminbar').length ) {
			adminbar_height = parseInt( $('#wpadminbar').css('height'), 10 );
		}

		if ( tbWindow.size() ) {
			tbWindow.width( W - 50 ).height( H - 45 - adminbar_height );
			$('#TB_iframeContent').width( W - 50 ).height( H - 75 - adminbar_height );
			tbWindow.css({'margin-left': '-' + parseInt( ( ( W - 50 ) / 2 ), 10 ) + 'px'});
			if ( typeof document.body.style.maxWidth !== 'undefined' ) {
				tbWindow.css({'top': 20 + adminbar_height + 'px', 'margin-top': '0'});
			}
		}
	};

	$(window).resize(function(){ tb_position(); });
});
