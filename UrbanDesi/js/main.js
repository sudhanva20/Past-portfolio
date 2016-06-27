/* globals TWEEN, Conduit, EventChannel */

// Create Namespace
var ED = window.ED || {};

// Event Manager
ED.EM = ED.EM || $({});
ED.Event = ED.Event || {
  "SEARCH_START"       : "searchStart",
  "SEARCH_COMPLETE"     : "searchComplete",

  "GRID_RESIZE"       : "gridResize",
  "GRID_FILTERED"      : "gridFiltered",
  "FILTERS_AVAILABLE"     : "filtersAvailable",

  "ADDED_TO_BASKET"     : "addedToBasket",
  "ADDED_TO_WISHLIST"    : "addedToWishlist",
  "WISHLIST_UPDATED"    : "wishlistUpdated",

  "UPDATE_COOKIE"     : "udpateCookie"
};

// INIT Template SubObject
ED.PageTemplate = ED.PageTemplate || {};
ED.OverlayTemplate = ED.OverlayTemplate || {};

// Setup default for DISCLAIMER_HEIGHT
ED.DISCLAIMER_HEIGHT = 0;

ED.App = (function(win, doc) {

    'use strict';

    var
        body = (doc.querySelector('.ie9') == null ) ? doc.body : doc.documentElement,
        $body = $(body),
        $win = $(win),
        $doc = $(doc),
        $html = $('html'),

        scrolled = 0,

        // Componet specific vars
        maxHeaderHeight = 390,
        $templateContent,

        // Specific to the header
        $header,
        $bg,
        $title,
        $text,
        parallax;

  function init() {

        ED.LogoAnimator.start();

        initLangCurrency();

        $templateContent = $(".template-content");
        $header = $('.template-header');
        $bg = $header.find('.header-background');
        $title = $header.find('h2');
        $text = $header.find('p');

        // Instantiate a new asset loader so we can tell when the page has
        // finished loading its image and video assets.
        new ED.AssetLoader($('#wrapper'));

        Conduit.add('App Scroll Listeners', scroll);
        // Conduit.add('App Resize Listeners', this.resize);
        Conduit.add('Tween.js animation loop', TWEEN.update);
        Conduit.start(60);

        // Bind some event listeners
        EventChannel.on('page changed', pageChanged);
        EventChannel.on('locale cookies updated', updateLangCookies);
        EventChannel.on('hidedisclaimer', hideCookieDisclaimer);

        $(window).on("resize", Utils.debounce(resize, 250));
  }

    function pageChanged() {

        // Cache some of our elements
        $templateContent = $(".template-content");
        $header = $('.template-header');
        $bg = $header.find('.header-background');
        $title = $header.find('h2');
        $text = $header.find('p');

        // Create a new anonymous asset loader - used to establish when the
        // page has finished loading its image and video assets.
        ED.AssetLoader($('#wrapper'));

        // Run any page specific javascript.
        ED.Page.init();

        // Scroll to the top of the page.
        ED.Scroller.jump(0);

        // Fire off an analytics pageview
        window.ga('send', 'pageview');

        hideCookieDisclaimer();
    }

  function initLangCurrency() {

    var
      defaultLang = Utils.readCookie("edwin-lang"),
      defaultCountry = Utils.readCookie("edwin-country"),
      defaultCurrency = Utils.readCookie("edwin-currency");

    // IF Cookie
    if ( defaultLang && defaultCountry && defaultCurrency ) {

      ED.Language = defaultLang;
      ED.Country = defaultCountry;
      ED.Currency = defaultCurrency;
      langCurrencyCallback();
    } else {
      var
        navLang = ( navigator.language || navigator.userLanguage || navigator.browserLanguage ),
        browserLang = null;

      if ( navLang.match("en") ) {
        browserLang = "en";
      }
      if ( navLang.match("fr") ) {
        browserLang = "fr";
      }
      if ( navLang.match("de") ) {
        browserLang = "de";
      }

      ED.Language = browserLang || "de";

      // IF GeoIP available
      if ( ED.ClientIP !== "::1" && ED.ClientIP !== "127.0.0.1" ) {

        $.ajax({
          dataType: 'json',
          url: "/api/geoip.php",
          data: { ip: ED.ClientIP },
          success: function ( countryData ) {
            var
              arrayCountryCode = ["AT", "BE", "FI", "FR", "DE", "NL", "ES", "SE", "CH", "GB", "IE", "GR", "CZ", "LU", "PT", "SK", "SI"],
              arrayCountry = ["austria", "belgium", "finland", "france", "germany", "netherlands", "spain", "sweden", "switzerland", "great-britain", "ireland", "greece", "czech", "luxembourg", "portugal", "slovakia", "slovenia"],
              arrayCurrency = ["eur", "eur", "eur", "eur", "eur", "eur", "eur", "eur", "chf", "gbp", "eur", "eur", "eur", "eur", "eur", "eur", "eur"],
              // arrayCountryCode = ["AT", "BE", "FI", "FR", "DE", "NL", "ES", "SE", "CH", "GB", "IE"],
              // arrayCountry = ["austria", "belgium", "finland", "france", "germany", "netherlands", "spain", "sweden", "switz", "great-britain", "ireland"],
              // arrayCurrency = ["eur", "eur", "eur", "eur", "eur", "eur", "eur", "eur", "chf", "gbp", "eur"],
              // arrayLang = ["de", "en", "en", "fr", "de", "en", "en", "en", "en", "en"],
              countryIndex = arrayCountryCode.indexOf( countryData.country_code );

            if ( countryIndex > -1 ) {

              ED.Country = arrayCountry[countryIndex];
              ED.Currency = arrayCurrency[countryIndex];

            } else {

              ED.Country = "other";
              ED.Currency = "eur";
            }

            langCurrencyCallback();
          },
          error : function() {
            defaultInit();
          }
        });

      } else {

        defaultInit();
      }

      // We have no cookie -> show cookie disclaimer
      showCookieDisclaimer();
    }

  }

  function defaultInit() {

    ED.Language = ED.Language || "en";
    ED.Country = "great-britain";
    ED.Currency = "gbp";

    langCurrencyCallback();
  }

  function showCookieDisclaimer() {
    ED.DISCLAIMER_HEIGHT = 80;
    $body.addClass('show-cookie-disclaimer');
  }

  function hideCookieDisclaimer() {
    ED.DISCLAIMER_HEIGHT = 0;
    $body.removeClass('show-cookie-disclaimer');
  }

  function langCurrencyCallback() {

    updateLangCookies();
    // ED.EM.on( ED.Event.UPDATE_COOKIE, $.proxy( updateLangCookies, this ) );

    ED.scrollPos = $(document).scrollTop();

    ED.WIDTH = $(window).width();
    ED.HEIGHT = $(window).height();

    ED.Nav.init();
    ED.Router.init();

    ED.Basket.init();
    ED.Wishlist.initNotification();

        ED.Tracking.init(window.ga);
  }

  function updateLangCookies() {
    Utils.createCookie("edwin-lang", ED.Language, 365);
    Utils.createCookie("edwin-country", ED.Country, 365);
    Utils.createCookie("edwin-currency", ED.Currency, 365);
        // console.log('updating language cookies', ED.Language, ED.Country, ED.Currency);
  }

  function getNumCols() {
    return ED.WIDTH > 1680 ? 5 : ( ED.WIDTH > 1360 ? 4 : ( ED.WIDTH > 1023 ? 3 : ( ED.WIDTH > 767 ? 2 : 1 ) ) );
  }

    var getScroll = (function() {

        if ( navigator.userAgent.toLowerCase().indexOf('firefox') !== -1 ) {
            return function() {
                return window.scrollY;
            };
        } else {
            return function() {
                return body.scrollTop;
            };
        }

    })();

    function scroll() {

        // fc++;
        // if ( fc % 10 === 0 ) {

        var s = getScroll(),
            gridpos;
            if ( s != scrolled && typeof $templateContent[0] !== 'undefined') {

                if ( s > 340 ) {
                    $body.addClass('pre-scrolled');
                    ED.EM.trigger('scrolled-after-header');
                } else {
                    $body.removeClass('pre-scrolled');
                    ED.EM.trigger('scrolled-before-header');
                }

                if ( s > 390 || $templateContent.offset().top <= 0) {
                    $body.addClass('scrolled');
                } else {
                    $body.removeClass('scrolled');
                }

                if ( $templateContent.length > 0 ) {
                    gridpos = $templateContent[0].getBoundingClientRect();

                    if ( s > 0 && s < ( gridpos.height + gridpos.top - wh ) ) {
                        if ( s > scrolled ) {
                            $body.removeClass("scroll-up").addClass("scroll-down");
                            // EventChannel.publish('scrolled down');
                        } else {
                            $body.removeClass("scroll-down").addClass("scroll-up");
                            // EventChannel.publish('scrolled up');
                        }
                    }
                }

                scrolled = s;

                // Parallax stuff

                parallax = {};

                if ( ED.WIDTH <= 1024 ) {

                    parallax = {
                        "opacity" : "",
                        "transform" : "",
                        "background-position" : ""
                    };

                    $title.css(parallax);
                    $text.css(parallax);
                    $bg.css(parallax);

                    return;
                }

                if ( s > maxHeaderHeight ) return;

                parallax = {
                    "opacity" : 1 - ( s / maxHeaderHeight ),
                    "transform" : "translateY(" + (-s/4) + "px)"
                };

                $title.css(parallax);
                $text.css(parallax);

                var paralaxInvert = {
                    "opacity" : 1 - ( s / maxHeaderHeight ),
                    "background-position" : "50% "+Utils.map( s, 0, maxHeaderHeight, 100, 0 )+"%"
                };

                $bg.css(paralaxInvert);
                // ED.Page.onScroll( ED.scrollPos );
            }
        // }
    }

  // function onScroll() {

  //   var
  //     currentScrollPos = $(document).scrollTop(),
  //     scrollStockist = $(".template-grid").length ? $(".template-grid").position().top : 1;

  //   if ( currentScrollPos > 340 ) {
  //     $("body").addClass("pre-scrolled");
  //   } else {
  //     $("body").removeClass("pre-scrolled");
  //   }

  //   if ( currentScrollPos > 390 || scrollStockist <= 0 ) {
  //     $("body").addClass("scrolled");
  //   } else {
  //     $("body").removeClass("scrolled");
  //   }

  //   if ( currentScrollPos > 0 && currentScrollPos < ( $(".template-grid").height() + parseInt($(".template-grid").css("top")) - ED.HEIGHT ) ) {
  //     if ( currentScrollPos > ED.scrollPos ) {

  //       $("body")
  //         .removeClass("scroll-up")
  //         .addClass("scroll-down");
  //     } else {

  //       $("body")
  //         .removeClass("scroll-down")
  //         .addClass("scroll-up");
  //     }
  //   }

  //   ED.Page.onScroll( ED.scrollPos );
  //   ED.scrollPos = currentScrollPos;
  // }

    /**
     * Lightweight window size helpers.
     */
    var ww = (function() {
        if (typeof win.innerWidth !== 'undefined') {
            return function() {
                return win.innerWidth;
            };
        } else {
            var b = ('clientWidth' in doc.documentElement) ? doc.documentElement : doc.body;
            return function() {
                return b.clientWidth;
            };
        }
    })();

    var wh = (function() {
        if (typeof win.innerHeight !== 'undefined') {
            return function() {
                return win.innerHeight;
            };
        } else {
            var b = ('clientHeight' in doc.documentElement) ? doc.documentElement : doc.body;
            return function() {
                return b.clientHeight;
            };
        }
    })();

    function isRetina() {

        if ( 'devicePixelRatio' in win ) {
            return window.devicePixelRatio;
        } else {
            return 1;
        }

    }

    function resize() {
        ED.WIDTH = ww();
        ED.HEIGHT = wh();

        ED.Nav.resize();
        ED.Page.resize();
        ED.Overlay.resize();
        ED.Basket.resize();
        ED.Wishlist.resize();
        ED.LogoAnimator.resize();
    }

    return {
        // functions
        init: init,
        initLangCurrency: initLangCurrency,
        defaultInit: defaultInit,
        langCurrencyCallback: langCurrencyCallback,
        updateLangCookies: updateLangCookies,
        getNumCols: getNumCols,

        scroll: scroll,
        resize: resize,
        ww: ww,
        wh: wh,

        retina: isRetina(),

        // common
        cmmn: {
            body: body,
            $body: $body,
            $doc: $doc,
            $win: $win,
        },

        brwsr: {
            ie9: $html.hasClass('ie9'),
            ie: ( window.navigator.userAgent.indexOf('MSIE ') >= 0 ||  window.navigator.userAgent.indexOf('Trident') >= 0 )
        }
    };

})(window, document);

/**
 * The DOM has finished loading - GO !
 */
$(function() {
    ED.App.init();
});

// $(window).on("scroll", $.proxy(ED.App.onScroll, this));
// $(window).on("resize", ED.App.resize);

/**
 * Modules
 */

ED._ = ED._ || {

	// This is the global store for the list of modules available
	registry: [],

	/**
	* Represents a module
	* @param {string} namespace - The namespace that this module exists at
	* @param {object} options - Default options for this module
	* @param {function} callback - The definition for this module. Eg the function
	* that get's run every time it's initiated
	*/
	module: function (namespace, options, callback) {
		if (typeof options == 'function') {
			callback = options;
			options = {};
		}
		this.registry.push({
			"namespace": namespace,
			"options": options,
			"callback": callback
		});
	},

	/**
	* Extracts options from a DOM node
	* @param {$} element - jQuery collection of the el
	* @return {object} - The options for this DOM element
	*/
	extract_options: function (element) {
		var attributes = element.get(0).attributes;
		var options = {};
		for (var i = 0, length = attributes.length; i < length; i++) {
			var attribute = attributes[i];
			if (attribute.name.indexOf('data-module-') === 0) {
				var prop = attribute.name.slice('data-module-'.length);
				var value;
				try {
					value = attribute.value === "" ? true : $.parseJSON(attribute.value);
				} catch (error) {
					value = attribute.value;
				}
				options[$.camelCase(prop)] = value;
			}
		}
		return options;
	},

	/**
	* For this DOM element iniate a new module
	* @param {$} element - the DOM element that needs building
	* @param {string} namespace - The namespace of the module needed to initiate
	*/
	build_module: function (element, namespace) {
		for (var i in this.registry) {
			if (this.registry[i].namespace == namespace) {
				var options = this.extract_options(element);
				var this_options = $.extend(this.registry[i].options, options);
				new this.registry[i].callback(
					$(element),
					this_options
				);
			}
		}
	},

	/**
	* Builds all [data-module]'s on the DOM
	* @return {$}
	*/
	build_modules : function() {
    var self = this;
		$('[data-module]').each(function () {
			var namespaces = $(this).data('module').split(' ');
			for (var n in namespaces) {
				self.build_module($(this), namespaces[n]);
			}
		});
		return this;
	}

};


if (!String.prototype.trim) {
  (function(){
    // Make sure we trim BOM and NBSP
    var rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;
    String.prototype.trim = function () {
      return this.replace(rtrim, "");
    };
  })();
}

// Production steps of ECMA-262, Edition 5, 15.4.4.18
// Reference: http://es5.github.io/#x15.4.4.18
if (!Array.prototype.forEach) {

  Array.prototype.forEach = function(callback, thisArg) {

    var T, k;

    if (this == null) {
      throw new TypeError(' this is null or not defined');
    }

    // 1. Let O be the result of calling ToObject passing the |this| value as the argument.
    var O = Object(this);

    // 2. Let lenValue be the result of calling the Get internal method of O with the argument "length".
    // 3. Let len be ToUint32(lenValue).
    var len = O.length >>> 0;

    // 4. If IsCallable(callback) is false, throw a TypeError exception.
    // See: http://es5.github.com/#x9.11
    if (typeof callback !== "function") {
      throw new TypeError(callback + ' is not a function');
    }

    // 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
    if (arguments.length > 1) {
      T = thisArg;
    }

    // 6. Let k be 0
    k = 0;

    // 7. Repeat, while k < len
    while (k < len) {

      var kValue;

      // a. Let Pk be ToString(k).
      //   This is implicit for LHS operands of the in operator
      // b. Let kPresent be the result of calling the HasProperty internal method of O with argument Pk.
      //   This step can be combined with c
      // c. If kPresent is true, then
      if (k in O) {

        // i. Let kValue be the result of calling the Get internal method of O with argument Pk.
        kValue = O[k];

        // ii. Call the Call internal method of callback with T as the this value and
        // argument list containing kValue, k, and O.
        callback.call(T, kValue, k, O);
      }
      // d. Increase k by 1.
      k++;
    }
    // 8. return undefined
  };
}

/*
  Tiny pub sub
 */
/* Make the `EventChannel` globally available. */
var EventChannel = (function() {
    /* Store Array.prototype.slice for use later. */
    var _slice = Array.prototype.slice;
    /* Setup an object to register our listeners/subscribers into. */
    var _listeners = {};

    function on(ev, fn, thisArg) {
        /* Allow a subscription to set its own scope for a handler,
         * if no `thisArg` is supplied, default to the `EventChannel`. */
        thisArg = thisArg || EventChannel;

         /* Instantiate an array for the listers of type `ev`
          * if one does not already exist. */
        _listeners[ev] = _listeners[ev] || [];
        /* Push the listener `fn` and scope into the array. */
        _listeners[ev].push({ fn : fn, thisArg : thisArg });

        /* Return a decoupling function to remove the listener
         * from the array if needed. */
        var idx = _listeners[ev].length - 1;
        return function off() {
            _listeners[ev].splice(idx, 1);
        };
    }

    function publish(ev) {
        /* Store all remaining arguments to pass
         * through to the listener. */
        var props = _slice.call(arguments, 1);

         /* If there are no listeners for `ev` bail out early. */
        if (!(ev in _listeners)) return;

        /* Iterate over listeners apply remaining arguments
         * and supplied `thisArg` to each `fn`. */
        _listeners[ev].forEach(function(listener) {
            listener.fn.apply(listener.thisArg, props);
        });
    }

    return {
        on: on,
        publish: publish
    };
})();


window.Utils = window.Utils || {

  format_price : function ( price, currency ) {

    var tax = 1.19;

    price *= tax;
    price = Utils.number_format(price, 2, '.', '');

    if ( currency == "eur" || currency == "EK" ) {
      return price+"€";
    } else if ( currency == "chf" || currency == "CHF" ) {
      return price+"CHF";
    } else {
      return "£"+price;
    }

  },

  number_format : function (number, decimals, dec_point, thousands_sep) {
    number = (number + '')
      .replace(/[^0-9+\-Ee.]/g, '');
    var n = !isFinite(+number) ? 0 : +number,
      prec = !isFinite(+decimals) ? 0 : Math.abs(decimals),
      sep = (typeof thousands_sep === 'undefined') ? ',' : thousands_sep,
      dec = (typeof dec_point === 'undefined') ? '.' : dec_point,
      s = '',
      toFixedFix = function (n, prec) {
        var k = Math.pow(10, prec);
        return '' + (Math.round(n * k) / k)
          .toFixed(prec);
      };
    // Fix for IE parseFloat(0.55).toFixed(0) = 0;
    s = (prec ? toFixedFix(n, prec) : '' + Math.round(n))
      .split('.');
    if (s[0].length > 3) {
      s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
    }
    if ((s[1] || '')
      .length < prec) {
      s[1] = s[1] || '';
      s[1] += new Array(prec - s[1].length + 1)
        .join('0');
    }
    return s.join(dec);
  },

  validateEmail : function (email) {
      var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      return re.test(email);
  },

  intersect_safe : function (a, b) {

    var ai = 0, bi= 0;
    var result = [];

    while( ai < a.length && bi < b.length ){
      if (a[ai] < b[bi] ){ ai++; }
      else if (a[ai] > b[bi] ){ bi++; }
      else /* they're equal */ {
        result.push(ai);
        ai++;
        bi++;
      }
    }

    return result;
  },

  intersect : function(a, b) {
    var t;
    if (b.length > a.length) {
      t = b;
      b = a;
      a = t; // indexOf to loop over shorter
    }
    return a.filter(function (e) {
      if (b.indexOf(e) !== -1) return true;
    });
  },

  map : function(value, start1, stop1, start2, stop2) {
    return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
  },

  arrToString : function(arr) {
    for ( var i = 0, max = arr.length; i < max; i++ ) {
      arr[i] += "";
    }
    return arr;
  },

  toRad : function(angle) {
    return Math.PI * angle / 180;
  },

  createCookie : function(name,value,days) {

    var expires = "";
    if (days) {
      var date = new Date();
      date.setTime(date.getTime()+(days*24*60*60*1000));
      expires = "; expires="+date.toGMTString();
    }
    // var domain = window.location.hostname;
    document.cookie = String(name+"="+value+expires+"; path=/; domain=."+document.location.hostname);
    // console.log('cookie created', name+"="+value+expires+"; path=/; domain="+document.location.hostname);
  },

  readCookie : function(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
      var c = ca[i];
      while (c.charAt(0)==' ') c = c.substring(1,c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
  },

  eraseCookie : function(name) {
    Utils.createCookie(name,"",-1);
  },

  elementWithinViewport : function(el) {

    var top = el.offsetTop;
    var left = el.offsetLeft;
    var width = el.offsetWidth;
    var height = el.offsetHeight;
    while (el.offsetParent) {
      el = el.offsetParent;
      top += el.offsetTop;
      left += el.offsetLeft;
    }
    return (
      top < ( window.pageYOffset + window.innerHeight ) &&
      left < ( window.pageXOffset + window.innerWidth ) &&
      ( top + height ) > window.pageYOffset &&
      ( left + width ) > window.pageXOffset
    );
  },
    debounce: function(func, wait, immediate) {
        // Returns a function, that, as long as it continues to be invoked, will not
        // be triggered. The function will be called after it stops being called for
        // N milliseconds. If `immediate` is passed, trigger the function on the
        // leading edge, instead of the trailing.
        var timeout;
        return function() {
            var context = this, args = arguments;
            var later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    }
};


ED.Overlay = ED.Overlay || {

    searchInited : false,
    wishlistInited : false,
    basketInited : false,

    init : function(isOverlay, hash) {

        if ( isOverlay ) {
            $("#wrapper")
                .addClass("overlay-open")
                .data("hash", hash)
                .addClass( "overlay-" + hash );
        }

        if ( $(".block-search").length ) {
            this.searchInited = true;
            ED.OverlayTemplate.Search.init();
        }

        if ( $(".template-basket").length ) {
            this.basketInited = true;
            ED.OverlayTemplate.Basket.init();
        }

        if ( $(".template-wishlist").length ) {
            this.wishlistInited = true;
            ED.OverlayTemplate.Wishlist.init();
        }

        $('body').scrollTop(0);

        ED.Mobile.menuHack();
    },

    resize : function() {

        if ( this.searchInited ) {
            ED.OverlayTemplate.Search.resize();
        }

        if ( this.wishlistInited ) {
            ED.OverlayTemplate.Wishlist.resize();
        }
    }
};

/* globals EventChannel */

ED.Page = ED.Page || {

    isInited : false,
    homeInited : false,
    productInited : false,
    contactInited : false,
    fitguideInited : false,
    storesInited : false,
    stockistInited : false,
    articleInited : false,

    init : function() {

        this.isInited = true;

        if ( $(".block-home").length ) {
            this.homeInited = true;
            ED.PageTemplate.Home.init();
        }

        if ( $(".block-newsletter").length ) {
            ED.PageTemplate.Newsletter.init();
        }

        if ( $(".main-template").length ) {
            ED.PageTemplate.Main.init();
        }

        if ( $(".product-template").length ) {
            this.productInited = true;
            ED.PageTemplate.Product.init();
        }

        if ( $(".template-contact").length ) {
            this.contactInited = true;
            ED.PageTemplate.Contact.init();
        }

        if ( $(".template-fitguide").length ) {
            this.fitguideInited = true;
            ED.PageTemplate.FitGuide.init();
        }

        if ( $(".stores").length ) {
            this.storesInited = true;
            ED.PageTemplate.Store.init();
        }

        if ( $(".block-stockists").length ) {
            this.stockistInited = true;
            ED.PageTemplate.Stockist.init();
        }

        if ( $(".article").length ) {
            this.articleInited = true;
            ED.PageTemplate.Article.init();
        }

        if ( $(".image-loader").length ) {
            ED.ImageLoader.init();
        }

        EventChannel.on('scrolled', this.onScroll, this);
    },

    onScroll : function(scrollPos) {

        // ED.PageTemplate.Main.onScroll( scrollPos );

        if ( this.contactInited ) {
            ED.PageTemplate.Contact.onScroll(scrollPos);
        }
    },

    resize : function() {

        ED.PageTemplate.Main.resize();

        if ( this.homeInited ) {
            ED.PageTemplate.Home.resize();
        }

        if ( this.productInited ) {
            ED.PageTemplate.Product.resize();
        }

        if ( this.fitguideInited ) {
            ED.PageTemplate.FitGuide.resize();
        }

        if ( this.stockistInited ) {
            ED.PageTemplate.Stockist.resize();
        }

        if ( this.articleInited ) {
            ED.PageTemplate.Article.resize();
        }
    }
};


ED.Router = ED.Router || {

    previousHash : "/",
    previousSlug : "",
    previousVars : [],

	currentHash : "/",
	currentSlug : null,
    currentVars : [],

	currentPage : "/",
	currentPageSlug : null,

	init : function() {

        if ( !ED.App.brwsr.ie9 ) {
            History.Adapter.bind( window, 'statechange', $.proxy(this.handleStateChange, this) );
        }

		// Setup base hash
		this.updateHashSlug( true );
	},

	updateHashSlug : function ( forcePage ) {

		var
			fullHash = History.getHashByState().split("index.html"),
			hash = fullHash[1],
			slug = fullHash[2],
            vars = "";

		// Strip out the GET vars because Google analytics puts them in for event
		// tracking and it messes with the logic later
		if (hash && hash.indexOf('?') >= 0) {
			hash = hash.split('?')[0];
		}
		if (slug && slug.indexOf('?') >= 0) {
            vars = slug.split('?')[1];
			slug = slug.split('?')[0];
		}


        this.previousVars = this.currentVars;

        this.currentVars = vars;

		if ( this.currentHash == hash && this.currentSlug == slug ) return;

		this.previousHash = this.currentHash;
		this.previousSlug = this.currentSlug;

		this.currentHash = hash || "/";
		this.currentSlug = slug;

		// force current page and slug setup
		var
			overlays = ["search","wishlist","basket"],
			isOverlay = true;

		if ( forcePage && overlays.indexOf(hash) < 0 ) {
			this.currentPage = this.currentHash;
			this.currentPageSlug = this.currentSlug;
			isOverlay = false;
		}

		if ( forcePage ) {

			// this.handleChange();
			ED.Page.init();
			ED.Overlay.init(isOverlay, hash);

			ED.Nav.selectMenu( this.currentHash, this.currentSlug );
			ED.Nav.selectNav( this.currentHash );

			// Home special class
			if ( this.currentHash == "index.html" ) $("body").addClass("home");
			else if ( this.currentHash == "product" ) $("body").addClass("product");
			else $("body").removeClass("home");
		}
	},

	handleStateChange : function () {
		this.updateHashSlug();
		this.handleChange();
	},

	handleChange : function () {

		switch ( this.currentHash ) {

			case "search" :
			case "wishlist" :
			case "basket" :

				ED.Nav.showOverlay( this.currentHash, this.currentSlug );
				break;

			default :

				ED.Nav.showPage( this.currentHash, this.currentSlug );

				this.currentPage = this.currentHash;
				this.currentPageSlug = this.currentSlug;
				break;
		}
	}

};

/* globals EventChannel, Modernizr, jQuery */

/**
 * Module for determining whether the assets on a page have loaded
 */
ED.AssetLoader = function(el, finished, single) {

    'use strict';

    var
        $el = (el instanceof jQuery) ? el : $(el),
        $images = $('img', $el),
        $videos = $('video', $el),
        num = $images.length + (Modernizr.touch ? 0 : $videos.length),
        numloaded = 0;

    // When an asset has loaded, fire off a callback if single is set, then call the
    // loaded function to determine whether we have finished loading all of them.
    function listen(el, ev, rdy) {
        el.on(ev + ' error', function(e){
            if ( single !== undefined ) single.call(this, e);
            loaded(this);
        }).each(function() {
            if (this[rdy]) $(this).trigger(ev);
        });
    }

    function loaded() {
        numloaded++;
        if ( numloaded === num ) {
            if ( finished !== undefined ) {
                finished();
            }
            EventChannel.publish('EDWIN PAGE LOADED');
        }
    }

    listen($images, 'load', 'complete');

    if ( !Modernizr.touch ) {
        listen($videos, 'canplay', 'canplay');
    }

    return {
        img: $images,
        vid: $videos
    };

};


ED.Basket = ED.Basket || {

    isBasket: false,
    showTimeout: null,

    init : function( isBasket ) {

        this.isBasket = isBasket || false;

        this.$btnRef = $(".root-nav .btn-basket");
        this.$notif = $(".notification-basket");
        this.positionNotif();

        ED.EM.on( ED.Event.ADDED_TO_BASKET, $.proxy( this.onAdded, this ) );
    },

    onBasketClick : function(e) {

        if ( $('.product-template .btn-link.btn-basket').hasClass('btn-disabled') ) {
            return false;
        }

        e.preventDefault();

        var
            $el = $(e.currentTarget),
            shopwareid = $el.attr("data-shopwareid"),
            concatfield = $el.attr("data-concatfield"),

            size = $(".block-size .btn-filter.selected").attr("data-size"),
            length = $(".block-length .btn-filter.selected").attr("data-length"),
            waist = $(".block-waist .btn-filter.selected").attr("data-waist"),

            url = "api/basket/update.html";

        $.ajax({
            "url" : url,
            "data" : {
                "shopwareid" : shopwareid,
                "concatfield" : concatfield,

                "size" : size,
                "length" : length,
                "waist" : waist,

                "action": "add"
            }
        }).success( function( number ) {
            ED.EM.trigger(ED.Event.ADDED_TO_BASKET, number);
        });
    },

    onAdded : function(e, number) {

        clearTimeout(this.showTimeout);
        this.$notif.addClass("show");

        var self = this;
        this.showTimeout = setTimeout(function() {
            self.$notif.removeClass("show");
            self.$btnRef.removeClass("animated");
        }, 3000);

        // animate icon menu
        this.$btnRef.addClass("highlight animated");

        this.updateNumber(this.$btnRef, number);

    },

    updateNumber : function ($el, number) {
        $el.removeClass('num-size-s num-size-xs');
        var btnClass = '';
        if (number === 0) {
          $el.removeClass('highlight');
        } else if (number > 99) {
          btnClass = 'num-size-xs';
          number = '99+';
        } else if (number > 9) {
          btnClass = 'num-size-s';
        }
        $el.addClass(btnClass).find(".num").text(number);

    },

    positionNotif : function() {
        if(!this.$notif) return;

        if ( ED.WIDTH >= 1024 ) {
            this.$notif.css("top", this.$btnRef.offset().top + 5);
            this.$notif.find(".arrow").css("left", "");
        } else {

            var extra = (ED.WIDTH > 768) ? 25 : 14;
            var newLeft = this.$btnRef.offset().left + parseInt(this.$btnRef.css("margin-left")) + extra;
            this.$notif.css("top", "");
            this.$notif.find(".arrow").css("left", newLeft);
        }
    },

    resize : function() {

        this.positionNotif();
    }
};


ED.Grid = ED.Grid || {

    $main : null,
    $wrapper : null,
    $items : null,
    $imgs : null,
    imgIndex : 0,
    timeout: false,
    interval : null,

    init : function() {
        // console.log('GRID INITIALISED');

        this.$main = $(".main-template");
        this.$wrapper = $(".template-grid");
        this.$items = $(".grid-item", this.$wrapper);
        this.$imgs = this.$wrapper.find('img');
        this.$filter = $(".filters");

        this.setHeights();
        this.$items.addClass("ready");

        $(".btn-product").on("click", $.proxy(this.onProductClick, this));

        this.imgIndex = 0;
        this.$imgs.on( 'load', $.proxy(this.imgLoaded, this) );

        if ( $(".main-template").hasClass("products") ) {
            ED.EM.on( ED.Event.GRID_RESIZE, $.proxy(this.onGridResize, this) );
            ED.EM.on( ED.Event.GRID_FILTERED, $.proxy(this.onGridFilter, this) );
        }
    },

    update : function() {
        // console.log('GRID UPDATE');

        this.$items = $(".grid-item", this.$wrapper);
        this.$imgs = this.$wrapper.find('img');
        this.resize();
    },

    onProductClick : function(e) {
        // console.log('GRID ONPRODUCTCLICK');
        if ( !ED.App.brwsr.ie9 ) {
            e.preventDefault();
            History.pushState({}, document.title, $(e.currentTarget).attr("href") );
        }
    },

    imgLoaded : function() {
        // console.log('GRID IMGLOADED');
        this.setHeights();
        this.imgIndex++;

        if ( this.imgIndex == this.$imgs.length ) {
            this.$items.addClass("ready");
        }
    },

    setHeights : function() {
        // console.log('GRID SETHEIGHTS');

        var hadReadyClass = this.$items.hasClass("ready");
        if (hadReadyClass) this.$items.removeClass("ready");

        // extra - set min height on container
        if ( this.$wrapper.hasClass("articles-grid") ) {
            this.$wrapper.css("min-height", "" );
        } else {
            this.$wrapper.css("min-height", ED.HEIGHT );
        }

        if ( this.$main.hasClass("faq") || this.$main.hasClass("story") || this.$main.hasClass("lookbook") ) return;

        var
            currentHeight = 0,
            maxHeight = 0;

        this.$items.css( 'height', '' );

        this.$items.each( function(i, el) {

            currentHeight = $(el).height();
            if ( currentHeight > maxHeight ) maxHeight = currentHeight;
        });

        this.$items.css( 'height', maxHeight );

        if (hadReadyClass) this.$items.addClass("ready");

        // what about height for non-fixed browsers
        if (ED.App.brwsr.ie) {
            $('.filters').css('min-height', $('.template-content').height());
            $('.template-content').css('min-height', $('.filters').height());
        }
    },

    onGridFilter : function(e, json) {
        // console.log('GRID GRIDFILTER');

        if (this.interval !== null) {
            clearInterval(this.interval);
            this.interval = null;
        }

        var is_animated = ( typeof json.animated !== 'undefined' && json.animated === true );

        $(".filter-no-results").hide();
        if (typeof json.ids === 'undefined') {
            // Show everything...
            this.$items.show();

        } else {
            // Hide everything...
            this.$items.hide();

            // Now results?
            if (json.ids.length === 0 ) {
                $(".filter-no-results").show();

            // Everything is ok
            } else {
                var hits = [];
                // Show the valid ones
                this.$items.each(function () {
                    var id = $(this).data('id');
                    if (json.ids.indexOf(id) >= 0) {
                        hits.push(this);
                    }
                });

                // Not animated... just showing
                if (!is_animated) {
                    $(hits).show();

                } else {
                    var animated = 0;
                    this.interval = setInterval(function () {
                        $(hits[animated]).hide().fadeIn();
                        animated++;
                        if (animated == hits.length) {
                            clearInterval(this.interval);
                            this.interval = null;
                        }
                    }, 100);
                }
            }
        }

    },

    onGridResize : function () {
        this.setHeights();
    },

    resize : function() {
        // console.log('GRID RESIZE');
        this.setHeights();
        this.$items.addClass("ready");
    }
};

/* globals Image */

ED.ImageLoader = ED.ImageLoader || (function(){

    var $items = [],
        images = [],
        index = 0;

    function init() {

        $items = $('.image-loader');

        $items.each(function () {

            var $this = $(this);

            if (!$this.data('inited')) {

                $this.data('inited', true);

                var $img = $('img', $this);

                $('<i class="throbber"></i>').appendTo($this);

                $this.addClass('loading');

                $img.on('load', handleLoaded);

                if (ED.App.brwsr.ie) {
                    var src = $img.prop('src');
                    $img.prop('src', src + '?' + new Date().getTime());
                }

                if ( $img.get(0).complete || $img.get(0).readyState == "complete" || $img.get(0).readyState == 4 ) {
                    $img.trigger('load');
                }
            }
        });
    }

    function handleLoaded() {
        var $this = $(this),
            parent = $this.parent();

        parent.removeClass('loading');
        $('.throbber', parent).remove();
    }

    /**
     * A function designed to preload a single image and fire a callback
     * when it has loaded.
     */
    function single(url, fn) {
        images.push(new Image());
        images[index].onload = fn;
        images[index].src = url;
        index++;
    }

    /**
     * A function designed to preload an array of images and fire a callback.
     */
    function load(img, all, one) {

        var num = img.length,
            loaded = 0;

        for ( var i in img ) {
            single(img[i], function() {
                loaded++;
                one();
                if ( loaded === num ) all();
            });
        }

    }

    init();

    return {
        init: init,
        handleLoaded: handleLoaded,
        single: single,
        load: load
    };

})();

/**
 * Loader module
 *
 * Just a simple image loader that show's a throbber until a image is loaded.
 * There's also extra logic in here to handle sequentially showing items visible
 * to the viewports first load.
 */

ED._.module('loader', { viewport: true }, function ($this, options) {

    // options.viewport == Do I need to wait for the items only visible in the
    // viewport to load and then display them sequentially?

    // Items that need loaders added to them
    var $items = $('.loader', $this);

    $items.each(function(i){
        var $this = $(this);
        $this.attr('data-loader-id', i);

        if ( ED.App.brwsr.ie9 ) {
            $this.addClass('loaded ready');
        }
    });

    // Total items loaded from within viewport
    var tick_loaded = 0;
    // The item I'm showing within the sequential loading
    var tick_position = 0;
    // The stack of all the items I want to load
    var tick_stack = [];

    // Called as initialisation
    function init () {

        if ( ED.App.brwsr.ie9 ) {
            return;
        }

        // For all the items I've got to load...
        $items
            .each(function (i) {
                // ... apply the load event to the image
                var img = $('.loader-load', this)
                    .on('load', handle_loaded)
                    .each(function(i) {
                        var $this = $(this);
                        $this.attr('data-loader-id', i);

                        if ( this.complete || this.readyState == "complete" || this.readyState == 4 ) {
                            $this.trigger('load');
                        }

                    });
                // ... am I a ticker?
                if (options.viewport) {
                    var keep_checking_in_viewport = true;
                    img.each(function () {
                        if (
                            keep_checking_in_viewport &&
                            Utils.elementWithinViewport(this)
                        ) {
                            var $el = $(this);
                            $el.data('i', i+1);
                            tick_stack.push($el);
                        } else {
                            keep_checking_in_viewport = false;
                        }
                    });
                }
            });
        // Animate the throbbers in...
        setTimeout(function () {
            $('.throbber', $items).addClass('appear');
        }, 10);
    }

    // Fires when image is loaded
    function handle_loaded () {
        var $el = $(this);

        if ( ED.App.brwsr.ie9 ) {
            $('.item-product[data-loader-id=' + $el.attr('data-loader-id') + ']').removeClass('loader');
            // show_me($el);
        } else {
            // Am I a sequential one?
            if ($el.data('i')) {
                tick_loaded++;
                // Start the sequential tick...
                if (tick_loaded >= tick_stack.length) {
                    setTimeout(tick, 200);
                }
            } else {
                show_me($el);
            }
        }
    }

    // Ticks sequential stack
    function tick () {
        if (tick_position < tick_stack.length) {
            show_me(tick_stack[tick_position]);
            tick_position++;
            setTimeout(tick, 200);
        }
    }

    // Marks an individual loader as loaded
    function show_me ($el) {
        $el.parents('.loader').addClass('loaded');
    }

    // Begin...
    init();

});

/* global Image, EventChannel */

/**
 * Module used to displaying the animated Edwin logo in the header
 * which is used to denote page-loading progress.
 */
ED.LogoAnimator = ED.LogoAnimator || (function() {

    'use strict';

    var
        $el = $('.logo .img-logo'),
        $el_mobile = $('.img-logo-mobile'),
        el = $el[0],
        numframes = parseInt($el.attr('data-sequence-length'), 10),

        last = numframes-1,
        playing = true,
        ready = false,
        current = 0,
        loaded = 0,
        fc = 0,
        preload = [],
        frames = [],
        inited = false;

    function start() {
        if ( $el.css('display') !== 'none' ) {
            playing = true;
            window.requestAnimationFrame(render);
        } else {
            $el_mobile.addClass('animate-flicker');
        }
    }

    function stop() {
        if ( $el.css('display') !== 'none' ) {
            playing = false;
        } else {
            $el_mobile.removeClass('animate-flicker');
        }
    }

    // Use request animation frame to update the src of the image to
    // the next frame of animation.
    function render() {
        fc++;

        if ( fc % 2 === 0 ) {
            next();
        }

        if (current < last) {
            window.requestAnimationFrame(render);
        } else if ( playing === true ) {
            window.requestAnimationFrame(render);
        }
    }

    // Display the next image in the sequence.
    function next() {
        if (ready) {
            current = (current < (frames.length-1) ? current+1 : 0);
            el.src = frames[current];
        }
    }

    // One of our preloading images is ready, check if we have finished preloading.
    function onload() {
        loaded++;
        if (loaded === numframes) {
            ready = true;
            el.src = frames[0];
        }
    }

    // Helper function for adding the animation frames to the array.
    function push(arr, num) {
        arr.push('/img/skin/animated-logo/logo-' + (num) + '.png');
    }

    // init
    function initDesktop() {
        if (!inited) {
            // We build two arrays; One with image elements that we will use for
            // preloading, the other for the urls of the images so we can
            // perform the animation.
            for (var i = 0, l = numframes; i < l; i++) {
                push(frames, i+1);
                preload.push(new Image());
                preload[i].onload = onload;
                preload[i].src = frames[i];
            }
            inited = true;
        }
    }

    function resize() {
        if (!inited && $el.is(':visible')) {
            initDesktop();
        }
    }

    if ($el.is(':visible')) {
        initDesktop();
    }

    // Listen for page-loading related events.
    EventChannel.on('EDWIN PAGE LOADED', stop);
    EventChannel.on('EDWIN PAGE LOADING', start);

    // Start the animation
    // start();



    // Expose our methods
    return {
        start: start,
        stop: stop,
        resize: resize
    };

})();

ED.Mobile = ED.Mobile || {

	init : function() {

		// Disable touch selection
		$('.disable-touch-selection').each(function() {
			this.onselectstart = function() {
				return false;
			};
			this.unselectable = "on";
			$(this).css('-moz-user-select', 'none');
			$(this).css('-webkit-user-select', 'none');
		});

	},

	// Menu hack for the contact / stores bug in mobile safari
	// .... it's mental... but it's a bug in safari that means you cannot touch
	// and select the correct area of the screen
	menuHack : function () {
		function MenuTop () {
			$('html,body').scrollTop(0);
		}
		var userAgent = window.navigator.userAgent;
		if (userAgent.match(/iPad/i) || userAgent.match(/iPhone/i)) {
			if ($('.template-contact').length > 0 || $('.store-content').length > 0) {
				$('.btn-menu').on('click', MenuTop);
			} else {
				$('.btn-menu').off('click', MenuTop);
			}
		}
	}

};

/* globals EventChannel */

ED.Nav = ED.Nav || {

    $wrapper : null,
    $indicator : null,
    $menu : null,
    $overlayShipping : null,

    numCols : 4,
    menuOpened : false,
    prevOpen : null,

    prevEDW : 0,
    prevEDH : 0,

    init : function() {

        this.$wrapper = $("#wrapper");
        this.$indicator = $(".nav .indicator");
        this.$menu = $(".block-menu .menu");
        this.$overlayShipping = $(".overlay-shipping");

        this.numCols = ED.App.getNumCols();

        this.initMenu();

        this.setMenuSize();
        this.setIconMargin( ( ED.WIDTH < 1024 ) );

        this.$wrapper.delegate( ".root-nav a, a.link-nav", "click", $.proxy(this.onItemClicked, this) );
        this.$wrapper.delegate( ".overlay-close", "click", $.proxy(this.onOverlayClose, this) );
        this.$wrapper.delegate( ".block-menu .menu a", "click", $.proxy(this.onMenuClicked, this) );

        $(".overlay-menu").on("click", $.proxy( this.onOverlayMenuClick, this ));

        this.initLanguages();

        this.prevEDW = ED.WIDTH;
        this.prevEDH = ED.HEIGHT;
    },

    onKeyUp : function(e) {

        if ( e.keyCode == 27 ) {
            this.onShippingClose( e );
        }
    },

    initMenu : function() {

        $(".sub-menu").each(function(i, list) {

            var sublist = $("ul", list);

            $(sublist)
                .data("h", $(sublist).height())
                .data("mb", $(sublist).css("margin-bottom") )
                .css({
                    "height" : 0,
                    "margin-bottom" : 0
                });

            $(list).addClass("close");
        });
    },

    initLanguages : function() {

        this.selectLangCountry();

        $(".btn-shipping").on("click", $.proxy( this.onShippingClick, this ));
        $(".btn-close", this.$overlayShipping).on("click", $.proxy( this.onShippingClose, this ));
        $(".btn-cancel", this.$overlayShipping).on("click", $.proxy( this.onShippingClose, this ));
        $(".btn-submit", this.$overlayShipping).on("click", $.proxy( this.onShippingConfirm, this ));
        $(".btn-language", this.$overlayShipping).on("click", $.proxy( this.onShippingBtn, this ));
        $(".btn-disclaimer").on("click", $.proxy( this.onHideDisclaimer, this ));


        $(document).on("keyup", $.proxy(this.onKeyUp, this));
    },

    onShippingClick : function(e) {

        e.preventDefault();
        this.$overlayShipping.addClass("show");

        if (this.menuOpened) {
            this.prevOpen = null;
            this.menuOpened = !this.menuOpened;
            this.setMenuSize();
            $(".nav").removeClass("selected");
        }
    },

    onShippingClose : function(e) {

        e.preventDefault();

        this.selectLangCountry();
        this.$overlayShipping.removeClass("show");
    },

    selectLangCountry : function() {

        $(".list-languages").find(".selected").removeClass("selected");
        $(".list-languages").find("[data-language='" + ED.Language + "']").addClass("selected");

        $(".list-countries").find(".selected").removeClass("selected");

        var
            $country = $(".list-countries").find("[data-country='" + ED.Country + "']"),
            newClass = $country.data("class"),
            oldClass = $(".btn-shipping").data("class");

        $country.addClass("selected");

        $(".btn-shipping")
            .removeClass( oldClass )
            .addClass( newClass )
            .data("class", newClass);

        $(".btn-shipping .text").text( $country.find(".text").text() );
    },

    onShippingConfirm : function(e) {

        e.preventDefault();

        var
            $lang = $(".list-languages").find(".selected"),
            $country = $(".list-countries").find(".selected");

        ED.Language = $lang.data("language");
        ED.Country = $country.data("country");
        ED.Currency = $country.data("currency");

        EventChannel.publish( 'locale cookies updated' );
        // this.onShippingClose(e);
        window.location.reload();
    },

    onShippingBtn : function(e) {

        e.preventDefault();

        var
            $btn = $(e.currentTarget),
            $list = $btn.parents(".list");

        $list.find(".selected").removeClass("selected");
        $btn.addClass("selected");
    },

    onHideDisclaimer : function(e) {
        e.preventDefault();
        EventChannel.publish( 'hidedisclaimer' );
    },

    onItemClicked : function(e) {

        if ( ED.App.brwsr.ie9 && $(e.currentTarget).attr('href') !== 'undefined' )  {

        } else {
            e.preventDefault();
        }

        var $el = $(e.currentTarget),
            target = $el.attr("href");

        if ( $el.hasClass("btn-menu") ) {

            if ( !this.menuOpened ) {
                this.prevOpen = $(".nav nav .close");
            } else {
                if ( this.prevOpen.length ) {
                    $el = $(this.prevOpen);
                    this.selectNav( $el.attr("href") ? $el.attr("href").replace("index.html", "") : "" );
                    this.prevOpen = null;
                }
            }

            this.menuOpened = !this.menuOpened;
            this.setMenuSize();

            if ( this.menuOpened ) {
                this.$indicator.addClass("dark");
            }

            if ( !this.menuOpened && this.prevOpen ) {
                $(".nav").removeClass("selected");
            }

            return;

        } else {
            this.menuOpened = false;
            this.setMenuSize();
        }

        if ( $el.hasClass("close") ) {
            if ( !ED.App.brwsr.ie9 ) {
                History.pushState({ norefresh : true }, document.title, "/" + ED.Router.currentPage + ( ED.Router.currentPageSlug ? "/" + ED.Router.currentPageSlug : "" )  );
            } else {
                window.location = window.location.host;
            }
        } else {

            if ( !ED.App.brwsr.ie9 ) {
                History.pushState({}, document.title, target );
            } else {
                var overlays = ["search","wishlist","basket"];
                if ( overlays.indexOf( ED.Router.currentHash ) >= 0 ) {
                    $(".nav").addClass("selected");
                    $el.addClass("close");
                }
            }
        }
    },

    onMenuClicked : function(e) {

        if ( !ED.App.brwsr.ie9 ) {
            e.preventDefault();
        }

        var
            $el = $(e.currentTarget),
            target = $el.attr("href"),

            $open = $(".sub-menu:not(.close)"),
            $parent = $el.parent(),
            $list = $("ul", $parent);

        if ( $el.hasClass("link-sub-menu") ) {

            if ( $parent.hasClass("close") ) {

                $open.addClass("close");
                $("ul", $open).css({
                    "height" : 0,
                    "margin-bottom" : 0
                });

                $parent.removeClass("close");
                $list.css({
                    "height" : $list.data("h"),
                    "margin-bottom" : $list.data("mb")
                });

            } else {

                $parent.addClass("close");
                $list.css({
                    "height" : 0,
                    "margin-bottom" : 0
                });
            }

            return;

        } else {

            $open.addClass("close");
            $("ul", $open).css({
                "height" : 0,
                "margin-bottom" : 0
            });

            this.menuOpened = false;
            this.setMenuSize();
        }

        if ( !ED.App.brwsr.ie9 ) {
            History.pushState({}, document.title, target );
        }
    },

    onOverlayClose : function(e) {

        e.preventDefault();
        History.pushState({ norefresh : true }, document.title, "/" + ED.Router.currentPage + ( ED.Router.currentPageSlug ? "/" + ED.Router.currentPageSlug : "" )  );
    },

    extractPageTitle : function ( html ) {
      var title = 'Edwin Europe';
      var check = html.split('<div class="page-title">');
      if (check.length > 1) {
        title = check[1].substr(0, check[1].length - 6);
      }
      document.title = title;
      return check[0];
    },

    showOverlay : function ( hash, slug ) {

        // Home special class
        if ( hash == "index.html" ) $("body").addClass("home").removeClass("product");
        else $("body").removeClass("home").removeClass("product");

        var
            self = this,
            url = "/" + hash + (slug ? "/" + slug : "");

        this.selectNav( hash );

        $.ajax({
                "url" : url
            })
            .success(function( responseHTML ) {

                responseHTML = self.extractPageTitle(responseHTML);

                var $overlay = $(".overlay-content");

                if ( !$overlay.length ) {

                    $overlay = $('<div class="overlay-content"></div>');
                    $overlay.insertAfter(".main-content");
                }

                // TODO Transition
                $overlay.html( responseHTML );

                if ( self.$wrapper.data("hash") != hash ) {
                    self.$wrapper.removeClass( "overlay-" + self.$wrapper.data("hash") );
                }

                self.$wrapper
                    .addClass("overlay-open")
                    .data("hash", hash)
                    .addClass( "overlay-" + hash );

                self.$menu.find(".selected").removeClass("selected");

                ED.Overlay.init();
            });
    },

    showPage : function ( hash, slug ) {

        // Home special class
        if ( hash == "index.html" ) $("body").addClass("home").removeClass("product");
        else if ( hash == "product" ) $("body").addClass("product").removeClass("home");
        else $("body").removeClass("home").removeClass("product");

        // Clean overlay
        $(".overlay-content").remove();
        this.$wrapper
            .removeClass("overlay-" + this.$wrapper.data("hash"))
            .removeClass("overlay-open");

        // Clean/select menu
        this.selectMenu(hash, slug);
        this.selectNav(hash);

        // Is this a filter URL?
        // ... and we're in the same section?
        if (
            History.getState().data.filter &&
            ED.PageTemplate.Main.Filters.isOnlyGetParamsChanging()
        ) {
            ED.EM.trigger('filter-changed-url');
            return;
        }

        // if already on page then no refresh
        if ( History.getState().data.norefresh ) {
            ED.Page.init();
            return;
        }

        var
            url = hash + (slug ? "?slug=" + slug : ""),
            isPartial = History.getState().data.partial,
            self = this;

        //
        if (url.indexOf('b2b')) {

        }

        EventChannel.publish('EDWIN PAGE LOADING');

        $.ajax( {
            "url" : url,
            "data" : {
                isPartial : isPartial,
                isInited : ED.Page.isInited
            }
        })
        .success(function( responseHTML ) {

            responseHTML = self.extractPageTitle(responseHTML);

            if ( isPartial && ED.Page.isInited ) {

                var $main = $(".main-template");

                $(".template-header, .template-content, .template-grid, .block-overlay, .block-btn-filter, .filters, .filters-cleaner, .store-content").remove();
                $main.append( responseHTML );

                if ( $main.find(".template-header").length > 0 ) {
                    $main.addClass("has-header");

                    if ( hash == "journal" ) {
                        $main
                            .addClass("has-menu light journal")
                            .removeClass("article");
                    }

                } else {
                    $main.removeClass("has-header");
                }

            } else {
                $(".main-content").html( responseHTML );
            }

            // We have successfully navigated to a new page, broadcast an event
            // so other modules can respond to this.
            EventChannel.publish('page changed');

            ED.Mobile.menuHack();
        });
    },

    selectMenu : function(hash, slug) {

        this.$menu.find(".selected").removeClass("selected");

        this.$menu.find(".sub-menu").addClass("close");
        this.$menu.find(".sub-menu ul").css({
            "height" : 0,
            "margin-bottom" : 0
        });

        if ( ["mens", "womens", "product", "fit-guide", "lookbook", "stores", "stockists"].indexOf(hash) > -1 ) {

            var className = "";

            if ( hash == "mens" || hash == "womens" ) {
                className = hash;
            } else if ( hash == "product" ) {

                // TODO Find out how to get the parent
                className = "mens" || "womens";
                hash = className;

            } else if ( hash == "stores" || hash == "stockists" ) {
                className = "find-us";
            } else {
                className = slug;
            }

            if (className) {
                var
                    $list = this.$menu.find( "." + className ),
                    $ul = $("ul", $list);

                $list.removeClass("close");
                $ul.css({
                    "height" : $ul.data("h"),
                    "margin-bottom" : $ul.data("mb")
                });

            }

            if ( hash == "stores" || hash == "mens" || hash == "womens" ) slug = null;

            this.$menu.find("a[href='/" + (hash + ( slug ? "/"+slug : "" )) + "']").addClass("selected");

        } else {
            // Exceptions //
            if ( hash == "article" ) hash = "journal";

            this.$menu.find("a[href='/"+hash+"']").addClass("selected");
        }
    },

    selectNav : function ( hash ) {

        if ( ["search", "wishlist", "basket"].indexOf(hash) > -1 ) {

            $(".nav").addClass("selected");
            $(".root-nav .close").removeClass("close");

            var $a = $(".root-nav a[href='/" + hash + "']");
            $a.addClass("close");

            this.$indicator.removeClass("dark");

            if ( ED.WIDTH > 1023 ) {
                this.$indicator.css({
                    "left" : "",
                    "right" : "",
                    "bottom" : "",
                    "top" : $a.offset.top + 8
                });
            } else {
                this.$indicator.css({
                    "right" : "",
                    "bottom" : "",
                    "top" : "",
                    "left": $a.find(".icon").offset.left - 5
                });
            }

        } else {

            $(".nav").removeClass("selected");
            $(".root-nav .close").removeClass("close");
        }

    },

    disableScroll : function(e) {
        e.preventDefault();
    },

    setMenuSize : function() {

        var
            menuWidth = this.numCols <= 2 ? ( Math.floor(ED.WIDTH / (this.numCols == 1 ? 1.4 : this.numCols) ) ) : (Math.floor((ED.WIDTH - 125) / this.numCols)),
            translate = this.menuOpened ? menuWidth+"px" : 0;

        if ( this.menuOpened ) {
            $(".nav").addClass("selected menu-selected");
            $(".root-nav .close").removeClass("close");
            $(".btn-menu").addClass("close");
            $(".overlay-menu").addClass("show");
            $("body").addClass("no-scroll");

            $(document).on('touchmove', this.disableScroll);
        } else {
            $(".nav").removeClass("menu-selected");
            $(".btn-menu").removeClass("close");
            $(".overlay-menu").removeClass("show");
            $("body").removeClass("no-scroll");

            $(document).off('touchmove', this.disableScroll);

            if ( $(".nav nav .close").length === 0 ) {
                $(".nav").removeClass("selected");
            }
        }

        // Set menu width
        $(".block-menu").css("width", menuWidth);
        $(".overlay-menu").css("left", menuWidth + ( ED.WIDTH > 1024 ? parseInt($(".nav").width()) : 0 ) );

        // translate : open / close
        // Removed .template-fitguide from this ludicrous query.
        $(".top-bar, .template-header, .template-content, .block-home, .product-template, .block-stockists, .block-empty, .search-form, .search-results", ".main-content, .overlay-content").css( "transform", ( translate === 0 ? "" : "translate3d("+translate+",0,0)" ) );
        $(".main-content .top-menu").css( "transform", ( translate === 0 ? "" : "translate3d("+translate+","+ ($("body").hasClass("scroll-down") ? '-51px' : 0) +",0)" ) );

        if ( translate === 0 ) {
            $( ".filters, .filters-cleaner").css("transform", "");
        } else {
            $( ".filters, .filters-cleaner").css("transform", "translateX("+($(".filters").width()-10)+"px)" );
        }

        // more for responsive
        if ( this.numCols <= 2 ) {

            if ( translate === 0 ) {
                $(".nav").css( "transform", "" );
            } else {
                $(".nav").css( "transform", "translateX("+translate+")" );
            }

            $(".block-menu").css({
                "left" : -menuWidth,
                "height" : ED.HEIGHT
            });

        } else {

            $(".nav").css( "transform", "" );
            $(".block-menu").css({
                "left": "",
                "height" : ""
            });
        }
    },

    setIconMargin : function(  ) {

        // var
        //  $btn = $(".nav .btn-wishlist"),
        //  extra = ED.WIDTH < 500 ? ( ED.WIDTH < 360 ? 0 : 50 ) : 150;

        // if ( resize ) {
        //  $btn.css("margin-left", ED.WIDTH - ($btn.outerWidth() * 4) - extra );
        // } else {
        //  $btn.css("margin-left", "");
        // }
    },

    onOverlayMenuClick : function(e) {

        e.preventDefault();

        this.menuOpened = false;
        this.setMenuSize();
    },

    resize : function() {

        if ( this.prevEDW == ED.WIDTH && this.prevEDH == ED.HEIGHT ) return;

        this.prevEDH = ED.HEIGHT;
        this.prevEDW = ED.WIDTH;

        this.numCols = ED.App.getNumCols();
        this.setMenuSize();

        this.setIconMargin( ( ED.WIDTH < 1024 ) );

        var $elClose = $(".root-nav .close");
        if ( $elClose.length ) {
            if ( ED.WIDTH > 1023 ) {
                this.$indicator.css({
                    "left" : "",
                    "right" : "",
                    "bottom" : "",
                    "top" : $elClose.offset.top + 8
                });
            } else {
                this.$indicator.css({
                    "right" : "",
                    "bottom" : "",
                    "top" : "",
                    "left": $elClose.find(".icon").offset.left - 5
                });
            }
        }
    }
};


ED.Newsletter = ED.Newsletter || {

	onSubmit : function(e) {

		e.preventDefault();

		var
			form = e.currentTarget,

			firstname = $(".input-firstname", form).val(),
			lastname = $(".input-lastname", form).val(),
			email = $(".input-email", form).val();

		$(".message-success, .message-error", form).hide();

		if ( firstname && lastname && email && Utils.validateEmail(email) ) {

			var list = $('[name="list"]', form).val();

			$.post("api/newsletter/signup.json", {
				"firstname" : firstname,
				"lastname" : lastname,
				"email" : email,
				"list" : list
			})
			.success(function( responseJSON ) {

				$(".message-success, .message-error", form).hide();

				if ( responseJSON.success ) {
					$(form).addClass("vhidden");
					$(".message-success", form).show();
				} else {
					$(".message-error", form).show();
				}
			});
		} else {
			$(".message-error", form).show();
		}
	}

};

/* globals TWEEN */

ED.Scroller = (function() {

    'use strict';

    var b = (document.querySelector('.lte9') == null ) ? document.body : document.documentElement;

    function getOffset(target){

        var docElem, box = {
            top: 0,
            left: 0
        },

        elem = target,
        doc = elem && elem.ownerDocument;
        docElem = doc.documentElement;

        if (typeof elem.getBoundingClientRect !== undefined ) {
            box = elem.getBoundingClientRect();
        }

        return {
            top: box.top + (window.pageYOffset || docElem.scrollTop) - (docElem.clientTop || 0),
            left: box.left + (window.pageXOffset || docElem.scrollLeft) - (docElem.clientLeft || 0)
        };

    }

    function scrollTo(target){

        var t = typeof target === 'number' ? target : $(target).offset().top;

        new TWEEN.Tween( { y: b.scrollTop } )
            .to( { y: t }, 600 )
            .easing( TWEEN.Easing.Cubic.Out )
            .onUpdate( function () {
                b.scrollTop = this.y;
            })
            .start();
    }

    function jump(target) {
        var t = typeof target === 'number' ? target : $(target).offset().top;
        if ($('.top-menu').length > 0) {
            t -= $('.top-menu').height() - 2;
        }
        b.scrollTop = t;
    }

    return {
        scrollTo: scrollTo,
        getOffset: getOffset,
        jump: jump
    };

})();


ED.SequenceLoader = ED.SequenceLoader || {

	$container : null,
	$items : null,
	stack : null,

	init : function() {

		this.$container = $('.sequence-loader');
		this.$items = $('.sequence-loader-item', this.$container);
		this.stack = [];

		// OK go through the items we want to add to the stack
		var self = this;
		this.$items.each(function () {
			var $el = $(this);
			var priority = $el.data('priority');
			self.addToPriorityStack(priority, $el);
		});

		// Start the stack at the fastest priority
		this.startStack(0);
	},

	addToPriorityStack : function (priority, $el) {

		if (typeof this.stack[priority] === 'undefined') {
			this.stack[priority] = {
				'loaded' : 0,
				'total' : 0,
				'items' : []
			};
		}
		this.stack[priority].items.push({
			'$el' : $el,
			'src' : $el.prop('src'),
			'loaded' : false
		});
		this.stack[priority].total++;
		if (!$el.get(0).complete) {
			$el.prop('src', '');
		} else {
			$el.trigger('load');
		}
	},

	startStack : function (priority) {

		if (typeof this.stack[priority] !== 'undefined') {
			var self = this;
			$.each(this.stack[priority].items, function () {
				if (!this.loaded && !this.error) {
					this.$el
						.prop('src', this.src)
						.on('load', $.proxy(self.handleLoaded, self, this.$el, priority, this))
						.on('error', $.proxy(self.handleLoaded, self, this.$el, priority, this));
				} else {
					self.checkCompletePriority(priority);
				}
			});
		}
	},

	handleLoaded : function (e, priority, item) {

		if (!item.loaded) {
			item.loaded = true;
			this.stack[priority].loaded++;
		}
		this.checkCompletePriority(priority);
	},

	checkCompletePriority: function (priority) {

		if (this.stack[priority].loaded == this.stack[priority].total) {
			this.startStack(priority+1);
		}
	},

	pauseStackForURL : function (url) {

		// Firstly stop all the unloaded items in the stack
		for (var i = 0; i < this.stack.length; i++) {
			$.each(this.stack[i].items, function () {
				if (!this.loaded) {
					this.$el.prop('src', '').off('loaded');
				}
			});
		}
		// Now load the needed item...
		var self = this;
		$('.sequence-loader-hidden').remove();
		var img = $('<img class="sequence-loader-hidden">')
			.prop('src', url)
			.css('visibility', 'hidden')
			.on('load', function () {
				self.startStack(0);
				$(this).remove();
			})
			.appendTo('body');
		if (img.get(0).complete) {
			$(this).trigger('load');
		}
	}

};


/**
 * Analytics tracking module - any links with the following attributes will fire off
 * analytics tracking events:
 * data-track-event="{ event_category }"
 * data-track-value="{ event_value }"
 */
ED.Tracking = ED.Tracking || (function(doc) {

    'use strict';

    function init() {

        $(doc).on('click', '[data-track-event]', function() {

            var $this = $(this);
            window.ga('send', 'event', $this.attr('data-track-event'), $this.attr('data-track-value'));
        });
    }

    return {
        init: init
    };

})(document);


ED.Wishlist = ED.Wishlist || {

    $wrapper : null,
    $btns : null,

    isWishlist : false,
    isBasket : false,
    showTimeout : null,

    init : function( isWishlist, isBasket ) {

        this.isWishlist = isWishlist || false;

        this.$wrapper = $(".template-grid");
        this.$btns = this.$wrapper.find(".btn-wishlist");

        if ( isBasket ) {
            this.isBasket = isBasket || false;
            this.$btns = $(".template-basket").find(".btn-wishlist");
        }

        this.initButtons();

		ED._.build_modules();

    },

    initNotification : function() {

        this.$btnRef = $(".root-nav .btn-wishlist");
        this.$notif = $(".notification-wishlist");
        this.$currentEl = null;
        this.positionNotif();

        ED.EM.on( ED.Event.ADDED_TO_WISHLIST, $.proxy( this.onAdded, this ) );
    },

    initButtons : function() {

        var self = this;
        this.$btns.each(function() {
          var $this = $(this);
          if (!$this.data('inited')) {
            $this
              .data('inited', true)
              .on("click", $.proxy( self.onWishlistClick, self ));
          }
        });
    },

    onWishlistClick : function(e) {

        e.preventDefault();

        var
            isWishlist = this.isWishlist,
            // isBasket = this.isBasket,
            $el = $(e.currentTarget),
            shopwareid = $el.data("shopwareid"),
            concatfield = $el.data("concatfield"),
            url = "/api/wishlist/" + ( $el.hasClass("wishlisted") ? "remove" : "add" ) + ".php",
            $block = $el.parent(".item-product");

        $.ajax({
            "url" : url,
            "data" : {
                "shopwareid" : shopwareid,
                "concatfield" : concatfield
            }
        }).success( function() {

            $el.toggleClass("wishlisted");

            if ( isWishlist && !$el.hasClass("wishlisted") ) {
                $block.remove();
                ED.EM.trigger( ED.Event.WISHLIST_UPDATED );
            } else {
                if ( $el.hasClass("wishlisted") ) {
                    ED.EM.trigger( ED.Event.ADDED_TO_WISHLIST, $el );
                }
            }
        });
    },

    onAdded : function(e, el) {

        clearTimeout(this.showTimeout);
        this.$notif.addClass("show");

        var self = this;
        this.showTimeout = setTimeout(function() {
            self.$notif.removeClass("show");
            self.$btnRef.removeClass("highlight");
            self.$currentEl.removeClass("highlight");
        }, 3000);

        // animate icon menu
        this.$btnRef.addClass("highlight");

        // animate icon on button
        this.$currentEl = $(el);
        this.$currentEl.addClass("highlight");
    },

    positionNotif : function() {
        if(!this.$notif) return;

        if ( ED.WIDTH >= 1024 ) {
            this.$notif.css("top", this.$btnRef.offset().top);
            this.$notif.find(".arrow").css("left", "");
        } else {

            var extra = (ED.WIDTH > 768) ? 25 : 14;
            var newLeft = this.$btnRef.offset().left + parseInt(this.$btnRef.css("margin-left")) + extra;
            this.$notif.css("top", "");
            this.$notif.find(".arrow").css("left", newLeft);
        }
    },

    resize : function() {

        this.positionNotif();
    }
};

/**
 * b2b modules
 */

ED._.module('b2b-form', function ($this) {

    var $list = $('.group-list', $this);
    $('input', $list).on('change', function () {
        $('label', $list).removeClass('chosen');
        $list.addClass('has-chosen');
        $(this).parent().addClass('chosen');
        $('.password', $this).removeClass('hide');
        $('.password input', $this).focus();
    });

});


ED.OverlayTemplate.Basket = ED.OverlayTemplate.Basket || {

	init : function() {

		this.$wrapper = $(".template-basket");

		this.$table = $(".table-basket", this.$wrapper);
		this.$mobile = $(".mobile-basket", this.$wrapper);

		this.initButtons();

		this.setTotal();
		this.checkEmpty();
		this.checkQuantity();
	},

	initButtons : function() {

		this.$wrapper.find(".btn-minus, .btn-more").on("click", $.proxy(this.onQuantityChange, this));
		this.$wrapper.find(".btn-remove").on("click", $.proxy(this.onRemove, this));
		this.$wrapper.find(".btn-submit").on("click", $.proxy(this.onCheckout, this));

		this.$wrapper.find(".btn-edit, .btn-done").on("click", $.proxy(this.onToggle, this));

		ED.Wishlist.init( false, true );
		ED.Nav.initLanguages();
	},

	onToggle : function(e) {

		e.preventDefault();
		$(e.currentTarget).parents(".line-product").toggleClass("open");
	},

	onQuantityChange : function(e) {

		e.preventDefault();

		var
			self = this,
			$el = $(e.currentTarget),
			$parent = $el.parents(".line-product"),
			$rows = this.$wrapper.find(".line-product:nth-child("+ ($parent.index() + 1) +")"),
			coeff = $el.hasClass("btn-more") ? 1 : -1,
			$row,

			shopwareid = $parent.data("shopwareid"),
            concatfield = $parent.data("concatfield"),
            url = "api/basket/update.html";

		$rows.each( function( i, row ) {

			$row = $(row);

			var
				$rowIndex = $row.index(),
				$quantity = $row.find(".quantity"),
				$quantityLabel = $row.find(".quantity-display"),
				$subtotal = $row.find(".price"),

				currency = $row.data("currency"),
				newQuantity = Math.max(1, parseInt($quantity.text()) + coeff),
				newPrice = (newQuantity * $row.data("price"));

			if ( newQuantity == 1 ) {

				$row.find(".minus-quantity").addClass("disabled");
				$("div.line-product").eq($rowIndex).addClass("disabled");

			} else {

				$row.find(".minus-quantity").removeClass("disabled");
				$("div.line-product").eq($rowIndex).removeClass("disabled");
			}

			$quantity.text( newQuantity );
			$quantityLabel.text( newQuantity );
			$subtotal.text( Utils.format_price( newPrice, currency ) );
			$row.data("total", newPrice);
		} );

		$.ajax({
            "url" : url,
            "data" : {
                "shopwareid" : shopwareid,
                "concatfield" : concatfield,
                "action": ( coeff == 1 ? "add" : "substract" )
            }
        }).success( function( ) {
           	self.setTotal();
        });
	},

	onRemove : function(e) {

		e.preventDefault();

		var
			self = this,
			$el = $(e.currentTarget),
			$parent = $el.parents(".line-product"),
			$rows = this.$wrapper.find(".line-product:nth-child("+ ($parent.index() + 1) +")"),

			shopwareid = $el.data("shopwareid"),
            concatfield = $el.data("concatfield"),
            url = "api/basket/update.html";

		$.ajax({
            "url" : url,
            "data" : {
                "shopwareid" : shopwareid,
                "concatfield" : concatfield,
                "action": "delete"
            }
        }).success( function( ) {

        	$rows.each( function( i, row ) {
				$(row).remove();
			});

           	self.setTotal();
			self.checkEmpty();
        });
	},

	onCheckout : function(e) {

		e.preventDefault();

		var
			country = Utils.readCookie("edwin-country"),
			checkoutURL = ED.CheckoutURL,
			shopId = this.getShopId( Utils.readCookie("edwin-currency") ),
			countryId = this.getCountryId( country ),
			ids = [],
			quantities = [];

		if (country != 'other') {
			$.ajax({
				"url" : "/api/basket/get.php"
			}).success(function( response ) {

				var language = Utils.readCookie("edwin-lang");

				$.each( response, function(i, item) {
					ids.push(item.shopwareid);
					quantities.push(item.quantity);
				} );

				checkoutURL = checkoutURL.replace('{LANG}', language);
				checkoutURL += "eArticles=" + ids.join(",");
				checkoutURL += "&eQuantity=" + quantities.join(",");
				checkoutURL += "&lang=" + language;
				checkoutURL += "&__shop=" + shopId;
				checkoutURL += "&country=" + countryId;

				window.location.href = checkoutURL;
			});
		}

	},

    /**
    *   Map country string from terms table to shopware country id
    */

	getCountryId : function (country) {

		var country_mask = {
			'germany': 2,
			'belgium': 5,
			'finland': 8,
			'france': 9,
			'great-britain': 11,
			'ireland': 12,
			'italy': 14,
			'netherlands': 21,
			'spain': 27,
			'sweden': 25,
			'austria': 23,
            'switzerland': 26,
            'czech': 33,
            'greece': 10,
            'luxembourg': 18,
            'portugal': 24,
            'slovenia': 39,
            'slovakia': 34
		};
		var countryId = 2;
		if (typeof country_mask[country] !== 'undefined') {
			countryId = country_mask[country];
		}
		return countryId;
	},

	getShopId : function( currency ) {

		switch ( currency ) {
			case "gbp" :
				return 1;
			case "chf" :
				return 2;
			case "eur" :
				return 3;
			default :
				return 1;
		}

	},

	setTotal : function() {

		var
			$el, $data, currency,
			total = 0,
			totalNum = 0;

		this.$table.find(".line-product").each(function(i, el) {

			$el = $(el);
			$data = $el.data();

			currency = $data["currency"];
			total += parseFloat($data["total"]);
			totalNum += parseInt($el.find(".quantity").text());
		});

		total = total || 0;
		currency = currency || '';

		this.$wrapper.find(".total").text( Utils.format_price( total, currency ) );
		this.$wrapper.find(".num-items").text( totalNum );

		ED.Basket.updateNumber($(".root-nav .btn-basket"), totalNum);
	},

	checkQuantity : function() {

		var $line;
		this.$wrapper.find(".line-product").each( function(i, line) {

			$line = $(line);
			if ( $line.data("quantity") == 1 ) {
				if ( $line.find(".minus-quantity").length > 0 )
					$line.find(".minus-quantity").addClass("disabled");
				else
					$line.addClass("disabled");
			}
		} );
	},

	checkEmpty : function() {

		if ( this.$wrapper.find(".line-product").length === 0 ) {

			$(".template-basket").hide();
			$(".block-empty").show();

			if (ED.Language == 'de') {
				$('.plural').hide();
			}
		}
	},

	resize : function() {

		if ( this.gridInited ) {
			ED.Grid.resize();
		}
	}
};


ED.OverlayTemplate.Search = ED.OverlayTemplate.Search || {

    gridInited : false,

    $wrapper : null,
    $inputKeyword : null,
    $grid : null,

    init : function() {

        var self = this;

        this.$wrapper = $(".block-search");
        this.$inputKeyword = $(".input-keyword");
        this.$grid = $(".search-results");

        this.$inputKeyword
            .on( "focus", function() {
                $(".placeholder, .no-results, .num-results").hide();
            } )
            .on( "blur", function() {
                if ( $(this).val().trim() === "" ) $(".placeholder").show();
            } );

        // Adding this in for IE9.
        $('.placeholder', this.$wrapper).on('click', function() {
            self.$inputKeyword[0].focus();
        });

        $(".search-form").on("submit", $.proxy( this.onSubmit, this ));
        $(".btn-top").on("click", $.proxy(this.smoothTop, this));
    },

    smoothTop : function(e) {
        e.preventDefault();

        $("html, body").animate({
            scrollTop : 0
        }, 300);
    },

    onResultClicked : function(e) {

        e.preventDefault();

        var
            self = this,
            $link = $(e.currentTarget),
            $nbResults = $(".nb-results"),
            $keyword = $(".keyword", $link),
            $number = $(".results", $link),
            slug = $link.data("slug");

        $(".keyword-top").html( $keyword.text() );

        // Populate number of results
        $nbResults
            .text( $number.text() )
            .show();

        // AJAX CALL with slug
        $.ajax({
            url : "/api/search/results.php",
            data : { "slug" : slug }
        })
        .success(function( resultsHTML ) {

            // POPULATE search-results
            self.$grid.html( resultsHTML );
            $(".block-search").addClass("has-results");

            // init Grid
            self.gridInited = true;
            ED.Grid.init();
            ED.Wishlist.init();
        });

    },

    onSubmit : function(e) {

        e.preventDefault();

        var val = this.$inputKeyword.val();
        if ( val.trim() === "" ) return;

        var
            self = this,
            noResult = $(".no-results"),
            nbResult = $(".num-results");

        // TODO get results
        $.ajax({
            url : "/api/search/results.php",
            data : { "slug" : val }
        })
        .success(function( resultsHTML ) {

            if ( resultsHTML == "false" ) {

                // populate and show the message under the input
                noResult
                    .html( noResult.data("text").replace( "###keyword###", '<span class="strong">' + val + '</span>' ) )
                    .show();

                // hide the results
                nbResult.hide();

                // clear the grid
                self.$grid
                    .empty()
                    .attr("style", "");

                self.$wrapper.removeClass("has-results");

            } else {

                // populate the results
                self.$grid.html( resultsHTML );
                self.$wrapper.addClass("has-results");
                self.gridInited = true;
                ED.Grid.init();
                ED.Wishlist.init();

                // populate the message under the input
                var num = self.$grid.find(".grid-item").length;

                nbResult
                    .html( nbResult.data("text")
                                    .replace( "###keyword###", '<span class="strong">' + val + '</span>' )
                                    .replace( "###number###", '<span class="strong">' + num + '</span>' ) )
                    .show();

                // populate the hidden top bar
                $(".keyword-top").text(val);
                $(".nb-results").text(num);

                // hide no results
                noResult.hide();
                $('input[type=text]').blur();
            }
        });

    },

    resize : function() {

        if ( this.gridInited ) {
            ED.Grid.resize();
        }
    }
};


ED.OverlayTemplate.Wishlist = ED.OverlayTemplate.Wishlist || {

	$wrapper : null,
	$grid : null,

	init : function() {

		this.$wrapper = $(".template-wishlist");
		this.$grid = $(".template-grid", this.$wrapper);

        this.$imgs = this.$grid.find( 'img' );
		this.$imgs.on( 'load', $.proxy(this.refresh, this) );
        ED.EM.on( ED.Event.WISHLIST_UPDATED, $.proxy(this.refresh, this) );

		// this.setHeights();
		ED.Grid.init();
        this.refresh();
        ED.Wishlist.init( true );

		this.pluralize();
	},

	pluralize : function () {
		var total = this.$wrapper.data('total');
		if (total == 1 || ED.Language == 'de') {
			$('.plural').hide();
		}
	},

    refresh : function() {
    	if ( this.$grid.find(".grid-item").length === 0 ) {
    		this.$wrapper.hide();
    		$(".block-empty").show();
    	}
    },

	resize : function() {

		ED.Grid.resize();
	}
};


ED.PageTemplate.Article = ED.PageTemplate.Article || {

	$container : null,

	init : function() {

		this.$container = $(".article");
		this.resizeVideo();
	},

	resize : function() {

		this.resizeVideo();
	},

	resizeVideo : function() {

		var
			refWidth = $(".template-inside", this.$container).width(),
			newHeight = Math.round(refWidth * 9 / 16);

		$(".video", this.$container).each(function(i, el) {
			$("iframe", el).attr( "height", newHeight );
		});
	}
};


ED.PageTemplate.Contact = ED.PageTemplate.Contact || {

    $container : null,

    init : function() {

        this.initNewsletter();
        this.initContactForm();

        ED.PageTemplate.Main.Header.init();

        this.$container = $(".template-contact");

        this.$container.find(".btn-more").on("click", $.proxy( this.onMore, this ));
        this.$container.find(".btn-less").on("click", $.proxy( this.onLess, this ));

        this.$container.find(".select-agents").selectmenu({
            change : $.proxy(this.onChangeAgent, this),
            position : {
                my: "left top",
                at: "left bottom",
                collision: "flip"
            }
        });

        ED.Mobile.menuHack();
    },

    initNewsletter : function() {

        $(".form-newsletter").on("submit", $.proxy( ED.Newsletter.onSubmit, this ));
    },

    initContactForm : function() {

        $(".form-contact").on("submit", $.proxy( this.onContactSubmit, this ));
    },

    onContactSubmit : function(e) {

        e.preventDefault();

        var
            form = e.currentTarget,

            firstname = $(".input-firstname", form).val(),
            lastname = $(".input-lastname", form).val(),
            email = $(".input-email", form).val(),
            orderNumber = $(".input-order", form).val(),
            message = $(".input-message", form).val(),

            success = $(".message-success", form),
            error = $(".message-error", form);

        success.hide();
        error.hide();

        if ( firstname && lastname && email && message && Utils.validateEmail(email) ) {

            $.post("api/contact/send.json",{
                "firstname" : firstname,
                "lastname" : lastname,
                "email" : email,
                "orderNumber" : orderNumber,
                "message" : message
            })
            .success(function( responseJSON ) {

                success.hide();
                error.hide();

                if ( responseJSON.success ) {
                    $(form).addClass("vhidden");
                    success.show();
                } else {
                    error.show();
                }
            });
        } else {

            error.show();
        }

    },

    onMore : function(e) {

        e.preventDefault();
        $(e.currentTarget).parents(".job").addClass("open");
    },

    onLess : function(e) {

        e.preventDefault();
        $(e.currentTarget).parents(".job").removeClass("open");
    },

    onChangeAgent : function(e, ui) {

        this.$container.find(".block-agent.visible").removeClass("visible");
        this.$container.find(".block-agent[data-country='" + ui.item.value + "']").addClass("visible");
    },

    onScroll : function() {

        // ED.PageTemplate.Main.Header.onScroll(pos);
    }
};


ED.PageTemplate.FAQs = ED.PageTemplate.FAQs || {

    $container : null,

    init : function() {

        ED.PageTemplate.Main.Header.init();

        this.$container = $(".template-faqs");
    },

    onScroll : function() {

        // ED.PageTemplate.Main.Header.onScroll(pos);
    }
};


ED.PageTemplate.FitGuide = ED.PageTemplate.FitGuide || {

	$container : null,
	$carousel : null,

	$intro : null,
	$items : null,
	$btns : null,
	$nav : null,
	$btnImg : null,

	$btnPrev : null,
	$btnNext : null,

	$overlayZoom : null,

	indexCarousel : 0,
	maxCarousel : 0,
	stepCarousel : 0,
	currentOffset : 0,

	init : function() {

		this.$container = $(".template-fitguide");
		this.$carousel = $(".template-inside", this.$container);
		this.$intro = $(".intro", this.$container);
		this.$items = $(".fitguide-item", this.$container);
		this.$btns = $(".btn-toggle", this.$container);
		this.$nav = $(".nav");
		this.$btnImg = $(".btn-img", this.$container);
        this.$btnStart = $('.start-loading', this.$container);

		this.$btnPrev = $(".btn-prev", this.$container);
		this.$btnNext = $(".btn-next", this.$container);

		this.$overlayZoom = $(".overlay-zoomed");

		// TODO: uncomment for zoom fun
		// this.$btnImg.on("click", $.proxy(this.onImgClick, this));
		// this.$overlayZoom.on("click", $.proxy(this.onZoomClick, this));

		this.$btns.on("click", $.proxy(this.onToggle, this));
        this.$btnStart.on("click", $.proxy(this.start, this));

		// ED.SequenceLoader.init();

		this.initSliders();
		this.sizeBlocks();
		this.initCarousel();
	},

    /**
     * The user has clicked on the button for one of the fit guide
     * sequences - start loading the images then display the controls
     * when it's finished loading!
     */
    start : function (e) {

        e.preventDefault();

        var $this = $(e.currentTarget),
            $section = $('.fitguide-item[data-order=' + $this.attr('data-order') + ']'),
            $sequence = $('img.frame', $section),
            sequence = [],
            num = $sequence.length,
            percent = 0,
            increase = 100 / num;

        $section.addClass('loading');

        $sequence.each(function() {
            sequence.push(this.getAttribute('data-src').replace('900/900/index.html', '270/270/index.html'));
        });

        ED.ImageLoader.load(sequence,
            function() {
                $section.addClass('loaded').removeClass('loading');

                $sequence.each(function() {
                    this.src = $(this).attr('data-src');
                });

                // var counter = 0;

                // Conduit.add('Fit guide sequence: ' + $this.attr('data-order'), function() {
                //     // counter++;

                //     // if ( counter % 2 === 0 ) {
                //         if ( frame === num ) frame = 0;
                //         block.src = sequence[frame];
                //         frame++;
                //     // }
                // });

                $('.slider', $section).slider({
                    range: "min",
                    value: 0,
                    min: 0,
                    max: num - 1,
                    step: 1,
                    slide: function( event, ui ) {
                        $($sequence).removeClass('selected');
                        $sequence.eq(ui.value).addClass('selected');

                        // window.requestAnimationFrame(function() {
                            // block.src = sequence[ui.value];
                        // });
                    }
                });

            },
            function() {
                // Single loaded
                percent += increase;
                $section.find('.progress').css("width", percent + '%');
            }
        );

    },

	initSliders : function() {

		// var self = this;
		// this.$container.find(".fitguide-item").each(function( i, item ) {

			// var $parent = $(".btn-img", item),
   //              $imgs = $("img", $parent);

			// $parent.data('count', 0).data('total', $imgs.length);
			// $imgs
			// 	.on('load', self.onSliderImageLoaded)
			// 	.each(function () {
			// 		if (this.complete) $(this).trigger('load');
			// 	});
		// });

	},

	onSliderImageLoaded : function () {

		var $el = $(this);
		var $parent = $el.parents('.btn-img');
		var total = $parent.data('total');
		var count = $parent.data('count')+1;
		var percent = (count * 100 / total);
		var progress = $el.parents(".fitguide-item").find(".progress");

		$parent.data('count', count);
		progress.css("width", percent + "%" );

		if (percent == 100) {
			var $container = $parent.parents(".fitguide-item");
			var slider = $container.find(".slider");

			$container.addClass("loaded");

			$(slider).slider({
				range: "min",
				value: 0,
				min: 0,
				max: total - 1,
				step: 1,
				slide: function( event, ui ) {
					var $btnImg = $el.parents('.btn-img');
					$btnImg.find(".selected").removeClass("selected");
					$btnImg.find("img:eq("+ui.value+")").addClass("selected");
				}
			});
		}
	},

	onToggle : function(e) {

		e.preventDefault();

		var
			$container = $(e.currentTarget).parent(),
			h = $container.find(".btn-img").data("height");

		$container.toggleClass("show-text");

		if ( $container.hasClass("show-text") ) {
			$container.find(".block-image").css("transform", "translateY(-" + h + "px)");
		} else {
			$container.find(".block-image").css("transform", "translateY(0)");
		}
	},

	sizeBlocks : function() {

		var
			refWidth = (ED.WIDTH - this.$nav.width() - 45),
			itemWidth = 0,
			h = ED.HEIGHT - 250 - ED.DISCLAIMER_HEIGHT;

		if ( ED.WIDTH >= 1280 ) {

			itemWidth = Math.round(refWidth / 4) + 1;
			this.$intro.css("width", itemWidth * 2 );
			this.$items.css("width", itemWidth );

			this.stepCarousel = 2;
			this.itemWidth = itemWidth;

			// items legnth + 2 for the intro block
			// itemwidth + 1 for the border
			this.$carousel.css("width", (this.$items.length + 2) * (this.itemWidth + 1) );

			// height of image
			this.$btnImg
				.data("height", h)
				.css("height", h);

		} else if ( ED.WIDTH >= 1024 ) {

			itemWidth = Math.round(refWidth / 2) + 1;
			this.$intro.css("width", itemWidth );
			this.$items.css("width", itemWidth );

			this.stepCarousel = 1;
			this.itemWidth = itemWidth;

			// items length + 2 for the intro block
			// itemwidth + 1 for the border
			this.$carousel.css("width", (this.$items.length + 1) * (this.itemWidth + 1) );

			// height of image
			this.$btnImg
				.data("height", h)
				.css("height", h);

		} else {

			this.$intro.css("width", "" );
			this.$items.css("width", "" );
			this.$carousel.css("width", "" );

			// height of image
			this.$btnImg
				.data("h", "")
				.css("height", "");
		}
	},

	initCarousel : function() {

		if ( this.$items.length > this.stepCarousel ) {
			this.$btnNext.addClass("show");
		}

		this.$btnNext.on("click", $.proxy( this.onCarouselNext, this ) );
		this.$btnPrev.on("click", $.proxy( this.onCarouselPrev, this ) );
	},

	onCarouselPrev : function(e) {

		e.preventDefault();

		this.indexCarousel -= this.stepCarousel;
		this.indexCarousel = Math.max( this.indexCarousel, 0 );

		this.currentOffset = -(this.indexCarousel*this.itemWidth);
		this.$carousel.css("transform", "translateX(" + this.currentOffset + "px)");

		if ( this.$items.length > this.stepCarousel - 2 ) this.$btnNext.addClass("show");
		if ( this.indexCarousel === 0 ) this.$btnPrev.removeClass("show");

	},

	onCarouselNext : function(e) {

		e.preventDefault();

		this.indexCarousel += this.stepCarousel;
		this.maxCarousel = (this.$items.length + this.stepCarousel) - this.getNumCols();
		this.indexCarousel = Math.min( this.indexCarousel, this.maxCarousel );

		this.currentOffset = -(this.indexCarousel*this.itemWidth);
		this.$carousel.css("transform", "translateX(" + this.currentOffset + "px)");

		this.$btnPrev.addClass("show");
		if ( this.indexCarousel == this.maxCarousel ) this.$btnNext.removeClass("show");
	},

	onImgClick : function(e) {

		e.preventDefault();

		if ( ED.WIDTH < 1024 ) return;

		var
			$link = $(e.currentTarget),
			$item = $link.parents(".fitguide-item"),
			refIndex = $item.index(),
			refWidth = $(".template-inside").width(),
			currentItem, currentIndex;

		this.$container.addClass("zoomed");
		$item.addClass("selected");

		$(".fitguide-item").each(function(i, item) {

			currentItem = $(item);
			currentIndex = currentItem.index();

			if ( currentIndex > refIndex ) {
				currentItem.css("transform", "translateX(" + refWidth + "px)");
			} else if ( currentIndex < refIndex ) {
				currentItem.css("transform", "translateX(" + (-(currentItem.position().left + currentItem.width())) + "px)");
			}
		});

		var
			selected = $item.find("img.selected"),
			src = selected.data("src"),
			blockWidth = $item.width(),
			imgWidth = selected.width(),
			imgHeight = $item.find(".btn-img").height(),
			refLeft = (ED.WIDTH > 1280) ? 125 + ( $item.position().left + this.currentOffset + ((blockWidth - imgWidth) * 0.5) ) : $item.position().left + ((blockWidth - imgWidth) * 0.5);

		ED.SequenceLoader.pauseStackForURL(src);

		this.$overlayZoom
			.css({
				"left" : refLeft,
				"width" : imgWidth,
				"height" : imgHeight,
				"background-image" : "url("+src+")"
			})
			.data("refLeft", refLeft)
			.data("imgWidth", imgWidth)
			.data("imgHeight", imgHeight);

		var self = this;
		setTimeout(function() {
			self.$overlayZoom
				.addClass("show")
				.css({
					"left" : (ED.WIDTH > 1280) ? 0 : self.$container.scrollLeft(),
					"width" : "100%",
					"height" : "100%"
				});
		}, 100);

		this.$overlayZoom.on("mousemove", $.proxy( this.onMouseMove, this ));

	},

	onZoomClick : function(e) {

		e.preventDefault();

		this.$overlayZoom.off("mousemove", $.proxy( this.onMouseMove, this ));
		this.$overlayZoom.css("background-position", "");

		this.$container.removeClass("zoomed");
		$(".fitguide-item.selected").removeClass("selected");

		$(".fitguide-item").each(function(i, item) {
			$(item).css("transform", "translateX(0)");
		});

		this.$overlayZoom
			.css({
				"left" : this.$overlayZoom.data("refLeft"),
				"width" : this.$overlayZoom.data("imgWidth"),
				"height" : this.$overlayZoom.data("imgHeight")
			});

		var self = this;
		setTimeout(function() {
			self.$overlayZoom
				.removeClass("show")
				.attr("style", "");
		}, 600);

	},

	onMouseMove : function(e) {

		this.$overlayZoom.css("background-position", "50% " + Utils.map( e.clientY, 0, ED.HEIGHT, 0, 100 ) + "%");
	},

	getNumCols : function() {
		return ( ED.WIDTH >= 1280 ) ? 4 : ( ED.WIDTH >= 1024 ) ? 2 : 1;
	},

	resize : function() {

		this.sizeBlocks();

		if ( this.indexCarousel !== 0 )
			this.$carousel.css("transform", "translateX(-" + this.indexCarousel*this.itemWidth + "px)");
	}
};



ED.PageTemplate.Home = ED.PageTemplate.Home || {

	$html : null,
	$container : null,
	$background : null,
	$videos : null,

	$swipe : null,
	isTabletMobileWidth : null,
	isUsingRollOver: false,
	whichOrientation : null,

	init : function() {

		this.$swipe = null;
		this.isTabletMobileWidth = null;
		this.isUsingRollOver = false;
		this.whichOrientation = null;

		this.$html = $("html");
		this.$container = $(".block-home");
		this.$background = $(".background-home", this.$container);
		this.$imgs = $(".background-home img");
		this.$videos = $(".background-home video");
        this.$blockImage = $('.block-image');

		this.itemWidth = this.$container.data('item-width');

 		this.mediaLength = this.$imgs.length + this.$videos.length;
 		this.mediaLoadedLength = 0;

        this.initRollOver();
		this.checkIfIShouldBeAbleToUseSwipe();

		ED.Mobile.init();
        new ED.AssetLoader('.main-content');

				setTimeout(function () {
						$('body').removeClass('page-loading');
				}, 500);


	},

	checkIfIShouldBeAbleToUseSwipe : function() {

		var checkIsTabletMobileWidth = ( ED.WIDTH < 1024 );
		// Only do this is I've switched into mobile/tablet width
		if ( checkIsTabletMobileWidth !== this.isTabletMobileWidth ) {
			this.isTabletMobileWidth = checkIsTabletMobileWidth;
			if ( Modernizr.touch ) {
				this.createSwipe();
			} else {
				if ( this.isTabletMobileWidth ) {
					this.createSwipe();
				} else {
					this.killSwipe();
				}
			}
		}
	},

	createSwipe : function() {

		this.isUsingRollOver = false;
		this.$html.addClass('has-swipe');
		this.watchSwipeImageOrientations(true);
		this.$swipe = new Swipe(document.getElementById('home-slider'), {
			speed: 400,
			continuous: true,
			disableScroll: false,
			stopPropagation: false,
			callback : $.proxy(this.onSwipe, this)
		});
		$(".btn-swipe").on("click", $.proxy(this.onBtnSwipeClick, this));
		this.onSwipe();
		this.preLoadSwipeOrientationImages();
	},

	watchSwipeImageOrientations : function(forceUpdate) {

		var checkRatio = ( ( ED.WIDTH / ED.HEIGHT ) <= 0.8 );
		var checkWhichOrientation = checkRatio ? 'portrait' : 'landscape';
		if (forceUpdate || checkWhichOrientation != this.whichOrientation) {
			this.whichOrientation = checkWhichOrientation;
			var self = this;
			$(".block-image").each( function(i, el) {
				var src = self.getImageOrientation($(el), false);
				if (src) {
					src = 'url('+src+')';
				}
				$(el).css("background-image", src);
			});
		}
	},

	getImageOrientation : function($el, forceOrientation) {

		if (this.isUsingRollOver) {
			return '';
		}
		var orientation = this.whichOrientation;
		if (forceOrientation) {
			orientation = forceOrientation;
		}
		var src = $el.data('image');
		if ( this.whichOrientation == 'portrait' && $el.data('image-portrait') ) {
			src = $el.data('image-portrait');
		}
		return src;
	},

	killSwipe : function () {

		this.isUsingRollOver = true;
		this.$html.removeClass('has-swipe');
		$(".block-image").css("background-image", "");
		if ( this.$swipe )
			this.$swipe.kill();
	},

	onBtnSwipeClick : function(e) {

		e.preventDefault();
		var index = $(e.currentTarget).data("index");
		this.$swipe.slide( index );
	},

	onSwipe : function() {

		$(".btn-swipe.selected").removeClass("selected");
		$(".btn-swipe").eq( this.$swipe.getPos() ).addClass("selected");
	},

	initRollOver : function() {

		var _ = this;

        if ( ED.App.brwsr.ie9 ) {
            $('.block-image').addClass('loaded');
        }

		this.$imgs.on('load', function(e){
			_.mediaIsLoaded.call(this, e);
			_.mediaItemLoaded();
		}).each(function() {
            if ( ED.App.brwsr.ie9 ) {
                $(this).addClass('loaded');
            }
			if (this.complete) $(this).trigger('load');
		});

		this.$videos.on('canplay', function(e){
			_.mediaIsLoaded.call(this, e);
			_.mediaItemLoaded();
		}).each(function() {
			if (this.canplay) $(this).trigger('canplay');
		});

        this.$blockImage.each(function () {
			$('<i class="throbber"></i>').appendTo(this);
		});

        if ( !Modernizr.touch ) {
            this.$blockImage.on("mouseenter", $.proxy(this.onOver, this));
            this.isUsingRollOver = true;
        }
	},

	onOver : function(e) {

		var $el = $(e.currentTarget);
		var index = $el.data("index");
		var hasVideo = $el.data("video");
		var element = hasVideo ? "video" : "img";
		var newElement = $(element+"[data-index='"+index+"']", this.$container);

		if (newElement.hasClass('visible')) return;

		$('.block-image').removeClass("current");
		$el.addClass('current');
		$('.visible', this.$container).removeClass('visible');
		newElement.addClass("visible");
	},

	mediaIsLoaded : function() {

		var $this = $(this);
		var index = $this.data('index') + 1;

		$this.addClass("loaded");

		// Does this one have a video and I'm a image?
		var context = $('.block-image:nth-child('+index+')');
		var check_video = ( typeof context.data('video') == 'string' );
		if ($this.is('img') && check_video) {
			$('img[data-index='+(index-1)+']', this.$background).removeClass('visible');
		} else {
			context.addClass('loaded');
		}
	},

	mediaItemLoaded : function() {
		this.mediaLoadedLength++;
		// if ( this.mediaLoadedLength === this.mediaLength ) {
		// 	EventChannel.publish('EDWIN PAGE LOADED');
		// }
	},

	preLoadSwipeOrientationImages : function () {

		var self = this;
		$(".block-image").each(function() {
			var $this = $(this);
			var portrait = self.getImageOrientation($this, 'portrait');
			if (portrait) {
				self.addPreloadImage(portrait);
			}
			var landscape = self.getImageOrientation($this, 'landscape');
			if (landscape) {
				self.addPreloadImage(landscape);
			}
		});
	},

	addPreloadImage : function(src) {

		$('<img>')
			.prop('src', src).css('visibility', 'hidden')
			.appendTo(this.$container);
	},

	resize : function() {

		this.watchSwipeImageOrientations(false);
		this.checkIfIShouldBeAbleToUseSwipe();
	}

};

ED.PageTemplate.Main = ED.PageTemplate.Main || {

	topMenuInited : false,
	headerInited : false,
	gridInited : false,
	lookbookInited : false,
	filterInited : false,

	init : function() {

		ED._.build_modules();

		if ( $(".top-menu").length ) {
			this.topMenuInited = true;
			ED.PageTemplate.Main.TopMenu.init();
		}

		if ( $(".template-header").length ) {
			this.headerInited = true;
			ED.PageTemplate.Main.Header.init();
		}

		// init Grid
		this.gridInited = true;
		ED.Grid.init();
		ED.Wishlist.init();

		if ( $(".lookbook").length ) {
			this.lookbookInited = true;
			ED.PageTemplate.Main.Lookbook.init();
		}

		if ( $(".filters").length ) {
			this.filterInited = true;
			ED.PageTemplate.Main.Filters.init();
		}

		if ( $(".infinite-load").length ) {
			$(".infinite-load").each(function () {
				ED.PageTemplate.Main.InfiniteLoader.init($(this));
			});
		}

		ED.Mobile.init();
	},

	resize : function() {

		if ( this.topMenuInited ) {
			ED.PageTemplate.Main.TopMenu.resize();
		}

		if ( this.headerInited ) {
			ED.PageTemplate.Main.Header.resize();
		}

		if ( this.lookbookInited ) {
			ED.PageTemplate.Main.Lookbook.resize();
		}

		if ( this.gridInited ) {
			ED.Grid.resize();
		}

		if ( this.filterInited ) {
			ED.PageTemplate.Main.Filters.resize();
		}
	}
};


ED.PageTemplate.Newsletter = ED.PageTemplate.Newsletter || {

	$container : null,
	$submit : null,

	firstName : false,
	lastName : false,
	email : false,
	list : false,

	init : function() {

		this.$container = $(".block-newsletter");
		this.$submit = $(".submit", this.$container);

		$(".block-newsletter input").on("keyup", $.proxy( this.onKeyUp, this ));
		$(".form-newsletter").on("submit", $.proxy( this.onSubmit, this ));
	},

	onKeyUp : function ( e ) {

		var $current = $(e.currentTarget);

		$(".message-success, .message-error").hide();

		if ( $current.hasClass("input-firstname") ) {
			if ($current.val() === "")
				this.firstName = false;
			else
				this.firstName = true;
		}

		if ( $current.hasClass("input-lastname") ) {
			if ($current.val() === "")
				this.lastName = false;
			else
				this.lastName = true;
		}

		if ( $current.hasClass("input-email") ) {
			if ( Utils.validateEmail($current.val()) )
				this.email = true;
			else
				this.email = false;
		}

		if ( this.firstName && this.lastName && this.email ) {
			this.$submit.removeClass("vhidden");
		} else {
			this.$submit.addClass("vhidden");
		}
	},

	onSubmit : function(e) {

		e.preventDefault();

		var
			self = this,
			form = e.currentTarget;

		$(".message-success, .message-error", form).hide();

		if ( this.firstName && this.lastName && this.email && this.list ) {

			$.ajax({
				url : "/api/newsletter/signup.php",
				data : {
					"firstname" : this.firstName,
					"lastname" : this.lastName,
					"email" : this.email,
					"list" : this.list
				}
			})
			.success(function( responseJSON ) {

				$(".message-success, .message-error", form).hide();

				if ( responseJSON.success ) {
					self.$submit.addClass("vhidden");
					$(".message-success", form).show();
				} else {
					$(".message-error", form).show();
				}
			});
		}
	}
};


ED.PageTemplate.Product = ED.PageTemplate.Product || (function() {

    'use strict';

    var $container = null,
    	$blockImage = null,
    	$blockImageCarousel = null,
    	$mainImage = null,
        $sizeOverlay = null,
        $closeBtn = null,
        $backBtn = null,
        $productSlider = null,
        $colourVariants = null,

        $swipe = null,
        $swipeDots = null,

        $responsiveImages = null,
        $thumbnailImages = null,

    	isZoomed = false,
        carousel = null,

        $waist = null,
        $waists = null,
        $length = null,
        $lengths = null,
        width;

	function init() {

		$container = $(".product-template");
		$blockImage = $(".block-image", $container);
		$blockImageCarousel = $(".block-image-carousel", $container);
		$mainImage = $(".main-image", $blockImage);
		$sizeOverlay = $(".product-overlay", $container);
        $closeBtn = $(".btn-close", $sizeOverlay);
        $backBtn = $(".btn-back", $container);
		$swipeDots = $('.swipe-dots a', $container);

        $productSlider = $('#product-slider');

		$responsiveImages = $('.responsive-image', $container);
		$thumbnailImages = $('.swipe-thumbnail', $container);

        $colourVariants = $('.block-colour-variants ul');

		initFilters();
		initDetails();
		initZoom();
		initCategory();
		initMenuBackButton();
		initResponsiveImages();

		ED.Nav.initLanguages();

		if ( ED.WIDTH <= 1023 ) {
			$productSlider.css("width", ED.WIDTH);
			// setTimeout( createSwipe, 100 );
      createSwipe();
		} else {
			initCarousel();
		}

		sizeBlock();
	}

	function initCategory() {

		var
			history = History.getStateByIndex( History.getCurrentIndex() - 1 ),
			splitted = history.hash.split("index.html"),
            category = splitted[splitted.length - 1];

		if ( splitted[1] == "mens" ) {

      var title = decodeURIComponent(category.split("?")[0]);
			$(".btn-back")
				.attr("href", history.hash.split("?")[0] )
				.find(".text").text(title);
		}
	}

    // Give the responsive image the correct background image depending on the orientation
    // @TODO: Add in a fallback if there is only one image defined - currently it shows a dead image.
	function initResponsiveImages() {

		var orientation,
            src,
            w = ED.App.ww(),
            h = ED.App.wh(),
            iw = (w+300) * ED.App.retina,
            ih = (h+300) * ED.App.retina;

        // Check for mobile as it has special case for image sizes
        if (w <= 767) {
            if (iw > 1000) {
                iw = 1000;
            }
            if (ih > 1000) {
                ih = 1000;
            }
        }

        // Pixel barrier
        var tolerance = 100;
        iw = Math.ceil( iw / tolerance ) * tolerance;
        ih = Math.ceil( ih / tolerance ) * tolerance;

        orientation = getOrientation(w);

        setResponsiveImage($mainImage, iw, ih);
        $thumbnailImages.each(function(i, v) {
            setResponsiveImage($(v), iw, ih);
        });

        // Set the correct background image for the orientation of the device / screen size.
        src = $mainImage.attr(orientation);
		$mainImage.attr('style', 'background-image: url(' + src + ');');

        ED.ImageLoader.single(src, function() {
            $mainImage.removeClass('background-loading');
        });

		$thumbnailImages.each(function() {
			var $this = $(this),
                src = $this.attr(orientation);

            $this.attr('style', 'background-image: url(' + src + ');');

            ED.ImageLoader.single(src, function() {
                $this.removeClass('background-loading');
            });
		});

	}

    // Get the current window size orientation
    function getOrientation(w) {
        if (w <= 640) {
            return 'data-image-portrait';
        } else if (w > 640 && w <= 768) {
            return 'data-image-landscape';
        } else if (w > 768 && w <= 1023) {
            return 'data-image-portrait';
        } else {
            return 'data-image-landscape';
        }
    }

    // Update the data-attributes for responsive image elements to use the
    // correct max-width and height values
    function setResponsiveImage(el, w, h) {
        el.attr('data-image-landscape', el.attr('data-image-landscape').replace('[EDWIN_WIDTH]', w).replace('[EDWIN_HEIGHT]', h) );
        el.attr('data-image-portrait', el.attr('data-image-portrait').replace('[EDWIN_WIDTH]', w).replace('[EDWIN_HEIGHT]', h) );
    }

	function initMenuBackButton() {
		$('.btn-back-menu').prop('href', $('.btn-back').prop('href'));
	}

	function initDetails () {
		$container.find(".btn-wishlist" ).on("click", ED.Wishlist.onWishlistClick);
		$container.find(".btn-link" ).on("click", ED.Basket.onBasketClick);
		$container.find(".btn-read-more").on("click", readMoreClick);
		$container.find(".block-size-guide h4 a").on("click", sizeGuideTitle);
        $closeBtn.on("click", closeOverlay);
        $container.find(".btn-back").on("click", onBackClick);
        // $(window).on("click", 'a.btn-back', onBackClick);
		$(window).on("keyup", onKeyUp);
	}

	function onKeyUp(e) {
		if ( e.keyCode == 27 ) {
			closeOverlay();
		}
	}

	function readMoreClick(e) {

		e.preventDefault();

		$(e.currentTarget).hide();
		$(".read-more").show();
	}

	function initFilters() {

		// Select by default

		var shopwareid = null,
			price = 0,
            discount = 0;

        // This must be used for tops and things with one size
		if ( $(".block-size").length ) {

			var selected = $(".block-size").find(".btn-filter:eq(0)");
			selected.addClass("selected");

			shopwareid = selected.data("shopwareid");
			price = selected.data("price");
            discount = selected.data("discount");

        // This must be for legged garments (?)
		} else if ( $(".block-length").length && $(".block-waist").length ) {


            /**
             * 1. Get the first length
             * 2. Get the available widths for that length
             * 3. Make the first width in that list available
             */

            $waist = $('.block-waist');
            $waists = $('.btn', $waist);
            $length = $('.block-length');
            $lengths = $('.btn', $length);

            $lengths.removeClass('selected');
            $waists.removeClass('selected');

            var length = $lengths.first(),
                waist = $('[data-waist=' + readAttr(length, 'waist') + ']', $waist),
                sizes;

            length.addClass('selected');
            waist.addClass('selected');

            // Pass on the shopware ID and price of the selecred combination
            shopwareid = readAttr(waist, 'shopwareid');
            price = readAttr(waist, 'price');
            discount = readAttr(waist, 'discount');

            sizes = getSizes();

            // Activate the widths that are available for the selected length
            for ( var i in sizes.waists ) {
                $('[data-waist=' + sizes.waists[i] +']', $waist).removeClass('inactive');
            }

		} else {
			price = $(".block-details .price").text();
			shopwareid = $(".btn-basket").data("shopwareid");
		}

        var price_html = price;
        if (discount) {
            price_html = '<span class="original">'+price+'</span><span class="discounted">'+discount+'</span>';
        }

		$(".block-details .price").html(price_html);
		$(".btn-wishlist, .btn-basket").data("shopwareid", shopwareid);

		$container.find(".btns-filter .btn").on("click", filterClick );
	}

    /*
    **  Handle back click and take over if we had active filters in the previous product overview
    **  In that case we update the URL manually and pass the GET vars for the filters
    */
    function onBackClick( e ) {
        if( ED.Router.previousVars && ED.Router.previousVars.length>0 && !ED.App.brwsr.ie9 ) {
            e.preventDefault();
            e.stopImmediatePropagation();
            History.pushState({ norefresh : false }, document.title, "/" + ED.Router.previousHash + "/" + ED.Router.previousSlug + '?' + ED.Router.previousVars );
        }
    }

    // Event handler for when the user clicks on a size filter (waist size or
    // length size) button.
	function filterClick (e) {

		e.preventDefault();

		var
			$el = $(e.currentTarget),
			$parent = $el.parent(),
            shopwareid = null,
            price = null,
            discount = null,
            indexLength = null,
            sizes;

        // If this button is inactive, escape here!
		if ( $el.hasClass("inactive") ) return;

		if ( !$el.hasClass("selected") ) {
			$parent.find(".selected").removeClass("selected");
			$el.addClass("selected");
		}

		if ( $el.hasClass("btn-size") ) {

			shopwareid = $el.data("shopwareid");
			price = $el.data("price");
			discount = $el.data("discount");

		} else if ( $el.hasClass("btn-length") ) { // the user has clicked on a length filter button

            // De-activate all of the waist size filter buttons
			$(".block-waist .btn-filter").addClass("inactive");

            // Get a list of waist sizes that are available in this length
            sizes = getSizes();

            // For each of the available waist sizes, go through and make them active
            for ( var i in sizes.waists ) {
                $(".block-waist [data-waist='" + sizes.waists[i] + "']").removeClass("inactive");
            }

            // Get the shopware ID
            indexLength = sizes.lengths.indexOf(sizes.length);

            // If the selected waist size is not available with the currently length, deselect it
            // and choose a substitute
			if ( sizes.$waist.hasClass("inactive") ) {

                // Deselect the button
				sizes.$waist.removeClass("selected");

                // Pick a new button (first available waist in the list)
				var newWaist = $(".block-waist [data-waist='" + sizes.waists[0] + "']");

                newWaist.addClass("selected");
                sizes = getSizes();

                // Get the array index that the current size appears in the available lengths for
                // this waist size?
                indexLength = sizes.lengths.indexOf(sizes.length);
                shopwareid = readAttr(sizes.$waist, 'shopwareid', true)[indexLength];
                price = readAttr(sizes.$waist, 'price', true)[indexLength];
                discount = readAttr(sizes.$waist, 'discount', true)[indexLength];

			} else {
                shopwareid = readAttr(sizes.$waist, 'shopwareid', true)[indexLength];
                price = readAttr(sizes.$waist, 'price', true)[indexLength];
                discount = readAttr(sizes.$waist, 'discount', true)[indexLength];
			}

		} else if ( $el.hasClass("btn-waist") ) {

			sizes = getSizes();
            indexLength = readAttr(sizes.$waist, 'length', true).indexOf(readAttr(sizes.$length, 'length'));
            shopwareid = readAttr(sizes.$waist, 'shopwareid', true)[indexLength];
            price = readAttr(sizes.$waist, 'price', true)[indexLength];
            discount = readAttr(sizes.$waist, 'discount', true)[indexLength];
		}

        var price_html = price;
        if (discount) {
            price_html = '<span class="original">'+price+'</span><span class="discounted">'+discount+'</span>';
        }

		$(".block-details .price").html(price_html);
		$(".btn-wishlist, .btn-basket").attr("data-shopwareid", shopwareid);
	}

    /**
     * Function that examines the data attributes of the size filters
     * and returns an object with the values needed for the basket to function
     * properly.
     */
    function getSizes() {

        // The .block elements that wrap the filter buttons
        var $waistWrapper = $('.block-waist'),
            $lengthWrapper = $('.block-length'),

            // the actual filter buttons
            $waists = $('.btn-filter', $waistWrapper),
            $lengths = $('.btn-filter', $lengthWrapper),

            $waist = $waists.filter('.selected'),
            $length = $lengths.filter('.selected'),

            $waistFirst = $waists.first(),
            $lengthFirst = $lengths.first(),

            waists = $length.attr('data-waist'),
            lengths = $waist.attr('data-length');

        return {
            waists: waists.indexOf(',') === -1 ? waists.split() : waists.split(','),
            lengths: lengths.indexOf(',') === -1 ? lengths.split() : lengths.split(','),

            waist: $waist.attr('data-waist') + '',
            length: $length.attr('data-length') + '',

            $waist: $waist,
            $length: $length,

            $waistFirst: $waistFirst,
            $lengthFirst: $lengthFirst
        };
    }

    /**
     * Function for safely reading data attributes that are comma seperated
     * values - checks to see if there are more than one before attempting to
     * access it.
     */
    function readAttr($el, attr, all) {
        var val = $el.attr('data-' + attr);
        if ( all ) {
            return val.indexOf(',') === -1 ? val.split() : val.split(',');
        } else {
            return val.indexOf(',') === -1 ? val.split()[0] : val.split(',')[0];
        }

    }

	function sizeGuideTitle(e) {
		e.preventDefault();
		$container.addClass("overlay-open");
        $sizeOverlay.addClass('show');
	}

	function initCarousel() {
		$("a", $blockImageCarousel).on("click", onCarouselClick);
        carousel = true;
	}

    function destroyCarousel() {
        $("a", $blockImageCarousel).off("click");
        carousel = null;
    }

	function onCarouselClick(e) {

		e.preventDefault();
		var $el = $(e.currentTarget);

		$blockImageCarousel.find(".selected").removeClass("selected");
		$el.addClass("selected");

        $mainImage.addClass('background-loading');
		$mainImage.attr('data-image-landscape', $el.attr('data-image-landscape'));
		$mainImage.attr('data-image-portrait', $el.attr('data-image-portrait'));

        setTimeout(function() {
            $mainImage.attr('style', 'background-image: url(' + $mainImage.attr(getOrientation()) + ');');
            $mainImage.removeClass('background-loading');
        }, 400);
	}

	function initZoom() {
		$mainImage.on("click", toggleZoom);
	}

	function toggleZoom(e) {
		e.preventDefault();

		isZoomed = !isZoomed;
		$container.toggleClass("zoomed");

		if ( isZoomed ) {
			$mainImage.on("mousemove", onMouseMove);
            $blockImage.animate({'width': ED.App.ww() - 125 }, 300);
		} else {
            $blockImage.animate({'width': ED.App.ww() - 125 - $('.block-details').outerWidth() }, 300);
			$mainImage.off("mousemove", onMouseMove);
			$mainImage.css("background-position", "");
		}
	}

	function onMouseMove(e) {
		$mainImage.css("background-position", "50% " + Utils.map( e.clientY, 0, ED.HEIGHT, 0, 100 ) + "%");
	}

	function sizeBlock() {

        if ( ED.App.ww() !== width ) {

            if ( ED.WIDTH > 1023 ) {
                if ( $swipe !== null ) {
                    destroySwipe();
                }
                if ( carousel === null ) {
                    initCarousel();
                }

                $productSlider.attr('style', '');
                $('.swipe-wrap div').attr('style', '');

            } else {
                $productSlider.css("width", ED.WIDTH);

                if ( $swipe !== null ) {
                    destroySwipe();
                }

                if ( $swipe === null ) {
                    createSwipe();
                }
                if ( carousel !== null ) {
                    destroyCarousel();
                }
            }

    		// var colWidth = ED.WIDTH > 1280 ? 0.25 : 0.3333;

    		if ( ED.WIDTH > 768 ) {
    			$blockImage.css({
    				"height" : ED.App.wh(),
                    "width": ED.App.ww() - 125 - $('.block-details').outerWidth()
    			});
    		} else {
    			$blockImage.css({
                    "width": "",
    				"height" : "",
    				"right" : ""
    			});
    		}

    		$blockImageCarousel.css("display", "none");

    		setTimeout(function() {
    			$blockImageCarousel.css("display", "block");
    		}, 5);

    		// resize the slider for mobile
    		if (ED.WIDTH <= 640) {
    			// var blockImageHeight = Math.ceil( ED.WIDTH / 1.211914062 );
                var blockImageHeight = ED.WIDTH / 0.9;
    			$('.block-image').css('height', blockImageHeight + 67);
    			$('.block-image-carousel').css('height', blockImageHeight);
    		}

            width = ED.App.ww();
        }

        if ($colourVariants.length > 0) {
            var height = 0;
            $('li a', $colourVariants).each(function () {
                $(this).css('height', 'auto');
                var _height = $(this).height();
                if (_height > height) {
                    height = _height;
                }
            });
            $('li a', $colourVariants).css('height', height);
        }
	}

	function closeOverlay(e) {

		if ( e ) e.preventDefault();
        $sizeOverlay.removeClass('show');
        $container.removeClass("overlay-open");
	}

	function createSwipe() {

    var hasSwipeAlready = ( $swipe === null ) ? false : true;

		$("a", $blockImageCarousel).on("click", function(e) { e.preventDefault(); });

        $productSlider.css("width", ED.WIDTH);

		$swipe = new Swipe($productSlider.get(0), {
			speed: 400,
			continuous: true,
			disableScroll: false,
			stopPropagation: false,
			callback : onSwipe
		});

    if ($productSlider.data('total') == 2) {
      $('[data-index=2] a, [data-index=3] a', $productSlider)
        .removeClass('background-loading selected');
    }

        // Bind event listeners to the pagination dots.
		$swipeDots.on('click', function(e) {
			e.preventDefault();
			var $this = $(this),
				index = $this.index();

			$swipe.slide(index, 400);
		});

    // If we're coming from a previous request (eg is this a history req) then
    // we need to make sure we deal with it (because otherwise images will be
    // too big for the content area)
    if (hasSwipeAlready) {
      width = 0;
      sizeBlock();
    }
	}

    function destroySwipe() {
        $("a", $blockImageCarousel).off("click");
        $swipeDots.off("click");
        $swipe.kill();

        $swipe = null;
    }

	function onSwipe( index, elm ) {

		var
			swipe = $(elm).parents(".swipe"),
			block = $(swipe).parents(".block-image"),
      position = $swipe.getPos();

    if ($productSlider.data('total') == 2) {
      if (position == 3) {
        position = 1;
      } else if (position == 2) {
        position = 0;
      }
    }

		$(".btn-swipe.selected", block).removeClass("selected");
		$(".btn-swipe", block).eq( position ).addClass("selected");
	}

	function resize() {
		sizeBlock();
		// this.responsiveImage();
	}

    return {
        init: init,
        resize: resize,
        createSwipe: createSwipe
    };

})();


ED.PageTemplate.Stockist = ED.PageTemplate.Stockist || {

    URL_GEOCODING : "http://maps.google.com/maps/api/geocode/json?sensor=false&address=",

    $wrapper : null,
    $grid : null,
    $inputKeyword : null,

    isCurrentLocation : false,
    isOnlineShown : false,

    markers : [],

    init : function() {

        this.$wrapper = $(".block-stockists");
        this.$grid = $(".grid-stockists", this.$wrapper);
        this.$inputKeyword = $(".input-keyword", this.$wrapper);
        this.$submit = this.$wrapper.find(".submit-stockists");
        this.$loading = $(".loading");

        this.$placeholder = $(".placeholder");
        this.$placeholderLocation = $(".placeholder-location");
        this.$placeholderOnline = $(".placeholder-online");

        this.$form = $(".stockists-form");
        this.$topText = $(".keyword-top");

        this.$noResult = this.$wrapper.find(".no-results");
        this.$nbResult = this.$wrapper.find(".num-results");
        this.$nbResultOnline = this.$wrapper.find(".num-results-online");

        this.initForm();
        this.initButtons();

        var self = this;

        $('.placeholder, .placeholder-location, .placeholder-online').on('click', function() {
            self.$inputKeyword[0].focus();
        });

        ED.Grid.init();
    },

    initForm : function() {

        var self = this;

        this.$inputKeyword
            .on( "focus", function() {
                if ( self.isOnlineShown ) {
                    self.$inputKeyword.trigger("blur");
                    return;
                }
                self.$placeholder.hide();
            } )
            .on( "blur", function() {
                if ( $(this).val().trim() === "" ) {
                    self.$placeholder.text( self.$placeholder.text() || self.$placeholder.data("text") ).show();
                }
            } );

        this.$form.on("submit", $.proxy( this.onSubmit, this ));
    },

    initButtons : function() {

        var
            self = this,
            $btnLoc = this.$wrapper.find(".btn-geolocation"),
            $btnOnline = this.$wrapper.find(".btn-online");

        $btnOnline
            .on("click", $.proxy( this.toggleOnline, this ))
            .on("mouseenter", function() {

                if ( ED.WIDTH < 767 ) return;

                var val = self.$inputKeyword.val();

                if ( val === "" ) self.$placeholder.hide();
                else self.$inputKeyword.css('visibility', 'hidden');

                self.$placeholderLocation.hide();
                self.$placeholderOnline.show();
            })
            .on("mouseleave", function() {

                if ( ED.WIDTH < 767 ) return;

                var val = self.$inputKeyword.val();

                if ( val === "" ) {
                    self.$placeholder.show();
                }
                self.$inputKeyword.css('visibility', 'visible');

                self.$placeholderLocation.hide();
                self.$placeholderOnline.hide();
            });

        if (navigator.geolocation) {
            $btnLoc
                .on("click", $.proxy(this.onGeolocation, this))
                .on("mouseenter", function() {

                    if ( ED.WIDTH < 767 ) return;

                    var val = self.$inputKeyword.val();

                    if ( val === "" ) self.$placeholder.hide();
                    else self.$inputKeyword.css('visibility', 'hidden');

                    self.$placeholderOnline.hide();
                    self.$placeholderLocation.show();
                })
                .on("mouseleave", function() {

                    if ( ED.WIDTH < 767 ) return;

                    var val = self.$inputKeyword.val();

                    if ( val === "" ) {
                        self.$placeholder.show();
                    }
                    self.$inputKeyword.css('visibility', 'visible');

                    self.$placeholderLocation.hide();
                    self.$placeholderOnline.hide();
                });


        } else {
            $btnLoc.addClass("disabled");
        }
    },

    onSubmit : function(e) {

        e.preventDefault();

        // LIGHT Clear all
        this.isCurrentLocation = false;
        this.isOnlineShown = false;

        this.$form.find(".selected").removeClass("selected");
        this.$submit.addClass("selected");

        this.$noResult.hide();
        this.$nbResult.hide();
        this.$nbResultOnline.hide();

        this.$submit.addClass("selected");

        this.$wrapper.removeClass("has-results");
        // LIGHT Clear all //

        var
            self = this,
            keyword = self.$inputKeyword.val();

        if ( keyword === "" ) {
            this.$placeholder.text( this.$placeholder.data("text") ).show();
            return;
        }
        this.$loading.show();
        $.ajax({
                url : "/api/stores/stockists.php",
                data : {
                    "keyword" : keyword
                }
            })
            .success(function( resultsHTML ) {

                self.$loading.hide();

                if ( resultsHTML === "" ) {

                    self.$noResult
                        .html( self.$noResult.data("text").replace( "###keyword###", '<span class="strong">' + keyword + '</span>' ) )
                        .show();

                    self.$wrapper.removeClass("has-results");

                } else {

                    // POPULATE search-results
                    self.$grid.html( resultsHTML );
                    self.$wrapper.addClass("has-results");

                    // init Grid
                    ED.Grid.init();

                    // populate the message under the input
                    var num = self.$grid.find(".grid-item").length;

                    self.$nbResult
                        .html( self.$nbResult.data("text")
                                        .replace( "###keyword###", '<span class="strong">' + keyword + '</span>' )
                                        .replace( "###number###", '<span class="strong">' + num + '</span>' ) )
                        .show();

                    // populate the hidden top bar
                    $(".keyword-top").text( keyword );
                    $(".nb-results").text( num );

                    // hide no results
                    self.$noResult.hide();
                }
            });
    },

    toggleOnline : function(e) {

        e.preventDefault();

        var self = this;

        if ( this.isOnlineShown ) {

            this.clearAll();

        } else {

            if ( this.isCurrentLocation ) this.clearAll();

            this.isOnlineShown = true;
            this.$inputKeyword.val("");
            this.$placeholder.text( $(e.currentTarget).data("text") ).show();
            this.$topText.text( $(e.currentTarget).data("text") );

            this.$form.find(".selected").removeClass("selected");
            $(e.currentTarget).addClass("selected");

            $.ajax({
                url : "/api/stores/stockists.php",
                data : {
                    "online" : true
                }
            })
            .success(function( resultsHTML ) {

                // HIDE NO RESULTS
                self.$noResult.hide();
                self.$loading.hide();
                self.$nbResult.hide();

                // POPULATE search-results
                self.$grid.html( resultsHTML );
                self.$wrapper.addClass("has-results");

                // init Grid
                ED.Grid.init();

                // SHOW RESULTS
                var num = self.$grid.find(".grid-item").length;
                self.$nbResultOnline.html(
                    self.$nbResultOnline.data("text").replace( "###number###", '<span class="strong">' + num + '</span>' )
                ).show();
                self.$nbResult.text( num );
            });
        }
    },

    onGeolocation : function(e) {

        e.preventDefault();

        if ( this.isCurrentLocation ) {

            this.clearAll();

        } else {

            if ( this.isOnlineShown ) this.clearAll();

            this.isCurrentLocation = true;

            this.$inputKeyword.val("");
            this.$placeholder.text( $(e.currentTarget).data("text") ).show();
            this.$topText.text( $(e.currentTarget).data("text") );

            this.$form.find(".selected").removeClass("selected");
            $(e.currentTarget).addClass("selected");

            this.$nbResult.hide();
            this.$nbResultOnline.hide();
            this.$noResult.hide();
            this.$loading.show();
            navigator.geolocation.getCurrentPosition( $.proxy(this.geolocationSuccess, this) );
        }
    },

    geolocationSuccess : function( position ) {

        $.getJSON( this.URL_GEOCODING + position.coords.latitude +","+ position.coords.longitude, $.proxy(this.onGeocodeSuccess, this) );
    },

    onGeocodeSuccess : function ( geocodeData ) {

        if ( geocodeData.results.length ) {

            var
                self = this,

                location = geocodeData.results[0],
                val = location.formatted_address,

                LAT = location.geometry.location.lat,
                LNG = location.geometry.location.lng,
                DIST = 100, // 100 km

                lng_sw = LNG - (DIST / (Math.abs(Math.cos(Utils.toRad(LAT))) * 111) ),
                lat_sw = LAT - (DIST / 111),

                lng_ne = LNG + (DIST / (Math.abs(Math.cos(Utils.toRad(LAT))) * 111) ),
                lat_ne = LAT + (DIST / 111);

            $.ajax({
                url : "/api/stores/stockists.php",
                data : {
                    "lat_sw" : lat_sw,
                    "lng_sw" : lng_sw,
                    "lat_ne" : lat_ne,
                    "lng_ne" : lng_ne
                }
            })
            .success(function( resultsHTML ) {

                self.$loading.hide();

                if ( resultsHTML === "" ) {

                    self.$noResult
                        .html( self.$noResult.data("text").replace( "###keyword###", '<span class="strong">' + val + '</span>' ) )
                        .show();

                    self.$wrapper.removeClass("has-results");

                } else {

                    // POPULATE search-results
                    self.$grid.html( resultsHTML );
                    self.$wrapper.addClass("has-results");

                    // init Grid
                    ED.Grid.init();

                    // populate the message under the input
                    var num = self.$grid.find(".grid-item").length;

                    self.$nbResult
                        .html( self.$nbResult.data("text")
                                        .replace( "###keyword###", '<span class="strong">' + val + '</span>' )
                                        .replace( "###number###", '<span class="strong">' + num + '</span>' ) )
                        .show();

                    // populate the hidden top bar
                    self.$topText.text( $(".btn-geolocation").data("text") );
                    $(".nb-results").text( "" );

                    // hide no results
                    self.$noResult.hide();
                }
            });

        } else {

            this.$loading.hide();

            this.$noResult
                .html( this.$noResult.data("text").replace( "###keyword###", '' ) )
                .show();

            this.$wrapper.removeClass("has-results");
        }
    },

    clearAll : function() {

        this.isCurrentLocation = false;
        this.isOnlineShown = false;

        this.$inputKeyword.val("");
        this.$placeholder.text( this.$placeholder.data("text") ).show();

        this.$form.find(".selected").removeClass("selected");
        this.$submit.addClass("selected");

        this.$noResult.hide();
        this.$nbResult.hide();
        this.$nbResultOnline.hide();

        this.$wrapper.removeClass("has-results");
    },

    resize : function() {

        ED.Grid.resize();
    }
};


ED.PageTemplate.Store = ED.PageTemplate.Store || {

	$container : null,
	$swipes : [],

	init : function() {

		this.$container = $(".stores");

		this.initSwipe();
		this.initMobile();
		this.initNewsletter();

        $('.swipe-item', this.$container).each(function() {
            var $this = $(this);
            ED.ImageLoader.single($this.attr('data-src'), function() {
                $this.animate({'opacity': 1}, 600);
            });
        });

		$(".btn-map", this.$container).on("click", $.proxy(this.onMapClick, this));
	},

	initSwipe : function() {

		var self = this,
            s;

		this.$swipes = [];

		$(".swipe").each( function( i, swipe ) {

			s = new Swipe( swipe, {
				speed : 800,
				callback : $.proxy(self.onSwipe, self)
			} );

			self.$swipes.push(s);
		});

        // Bind event listeners to the pagination dots.
        $('.swipe-dots a').on('click', function(e) {
            e.preventDefault();
            var $this = $(this),
                index = $this.index();

            self.$swipes[self.$swipes.length-1].slide(index, 400);
        });

		this.initSwipeButtons();
	},

	initSwipeButtons : function() {

		$(".btn-prev, .btn-next", this.$container).on("click", $.proxy(this.onSwipeNav, this));
	},

	onSwipeNav : function(e) {

		e.preventDefault();

		var
			$btn = $(e.currentTarget),
			i = $btn.parents(".block-store").index(),
			currentSlider = this.$swipes[i];

		if ( $btn.hasClass("btn-next") ) {
			currentSlider.next();
		} else {
			currentSlider.prev();
		}
	},

	onSwipe : function (index, elm) {

		var
			swipe = $(elm).parents(".swipe"),
			block = $(swipe).parents(".block-store"),
			indexBlock = block.index(),
			currentSlider = this.$swipes[indexBlock];

		$(".btn-swipe.selected", block).removeClass("selected");
		$(".btn-swipe", block).eq( currentSlider.getPos() ).addClass("selected");
	},

	initMap : function() {

        $('.map').lazyLoadGoogleMaps({
            callback: function(el, map) {

                var
                    $el = $(el),
                    center = new google.maps.LatLng( $el.data("lat"), $el.data("lng") ),

                    mapOptions = {
                        scrollwheel : false,
                        disableDefaultUI : true,
                        center: center,
                        zoom: 15,
                        mapTypeId: google.maps.MapTypeId.ROADMAP,
                        styles : [{"featureType":"water","elementType":"geometry.fill","stylers":[{"color":"#d3d3d3"}]},{"featureType":"transit","stylers":[{"color":"#808080"},{"visibility":"off"}]},{"featureType":"road.highway","elementType":"geometry.stroke","stylers":[{"visibility":"on"},{"color":"#b3b3b3"}]},{"featureType":"road.highway","elementType":"geometry.fill","stylers":[{"color":"#ffffff"}]},{"featureType":"road.local","elementType":"geometry.fill","stylers":[{"visibility":"on"},{"color":"#ffffff"},{"weight":1.8}]},{"featureType":"road.local","elementType":"geometry.stroke","stylers":[{"color":"#d7d7d7"}]},{"featureType":"poi","elementType":"geometry.fill","stylers":[{"visibility":"on"},{"color":"#ebebeb"}]},{"featureType":"administrative","elementType":"geometry","stylers":[{"color":"#a7a7a7"}]},{"featureType":"road.arterial","elementType":"geometry.fill","stylers":[{"color":"#ffffff"}]},{"featureType":"road.arterial","elementType":"geometry.fill","stylers":[{"color":"#ffffff"}]},{"featureType":"landscape","elementType":"geometry.fill","stylers":[{"visibility":"on"},{"color":"#efefef"}]},{"featureType":"road","elementType":"labels.text.fill","stylers":[{"color":"#696969"}]},{"featureType":"administrative","elementType":"labels.text.fill","stylers":[{"visibility":"on"},{"color":"#737373"}]},{"featureType":"poi","elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"featureType":"poi","elementType":"labels","stylers":[{"visibility":"off"}]},{"featureType":"road.arterial","elementType":"geometry.stroke","stylers":[{"color":"#d6d6d6"}]},{"featureType":"road","elementType":"labels.icon","stylers":[{"visibility":"off"}]},{},{"featureType":"poi","elementType":"geometry.fill","stylers":[{"color":"#dadada"}]}]
                    };

                    map.setOptions(mapOptions);

                var image = {
                    url: '/img/skin/map-marker.png',
                    size: new google.maps.Size(46, 82),
                    origin: new google.maps.Point(0,0),
                    anchor: new google.maps.Point(12, 41),
                    scaledSize : new google.maps.Size(23, 41)
                };

                new google.maps.Marker({
                    position: center,
                    map: map,
                    icon : image
                });
            }
        });

		// $(".map").each( function(i, el) {

		// 	var
		// 		$el = $(el),
		// 		center = new google.maps.LatLng( $el.data("lat"), $el.data("lng") ),

		// 		mapOptions = {
		// 			scrollwheel : false,
		// 			disableDefaultUI : true,
		// 			center: center,
		// 			zoom: 15,
		// 			mapTypeId: google.maps.MapTypeId.ROADMAP,
		// 			styles : [{"featureType":"water","elementType":"geometry.fill","stylers":[{"color":"#d3d3d3"}]},{"featureType":"transit","stylers":[{"color":"#808080"},{"visibility":"off"}]},{"featureType":"road.highway","elementType":"geometry.stroke","stylers":[{"visibility":"on"},{"color":"#b3b3b3"}]},{"featureType":"road.highway","elementType":"geometry.fill","stylers":[{"color":"#ffffff"}]},{"featureType":"road.local","elementType":"geometry.fill","stylers":[{"visibility":"on"},{"color":"#ffffff"},{"weight":1.8}]},{"featureType":"road.local","elementType":"geometry.stroke","stylers":[{"color":"#d7d7d7"}]},{"featureType":"poi","elementType":"geometry.fill","stylers":[{"visibility":"on"},{"color":"#ebebeb"}]},{"featureType":"administrative","elementType":"geometry","stylers":[{"color":"#a7a7a7"}]},{"featureType":"road.arterial","elementType":"geometry.fill","stylers":[{"color":"#ffffff"}]},{"featureType":"road.arterial","elementType":"geometry.fill","stylers":[{"color":"#ffffff"}]},{"featureType":"landscape","elementType":"geometry.fill","stylers":[{"visibility":"on"},{"color":"#efefef"}]},{"featureType":"road","elementType":"labels.text.fill","stylers":[{"color":"#696969"}]},{"featureType":"administrative","elementType":"labels.text.fill","stylers":[{"visibility":"on"},{"color":"#737373"}]},{"featureType":"poi","elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"featureType":"poi","elementType":"labels","stylers":[{"visibility":"off"}]},{"featureType":"road.arterial","elementType":"geometry.stroke","stylers":[{"color":"#d6d6d6"}]},{"featureType":"road","elementType":"labels.icon","stylers":[{"visibility":"off"}]},{},{"featureType":"poi","elementType":"geometry.fill","stylers":[{"color":"#dadada"}]}]
		//         },
		//         map = new google.maps.Map(el, mapOptions);

		// 	var image = {
		// 		url: '/img/skin/map-marker.png',
		// 		size: new google.maps.Size(46, 82),
		// 		origin: new google.maps.Point(0,0),
		// 		anchor: new google.maps.Point(12, 41),
		// 		scaledSize : new google.maps.Size(23, 41)
		// 	};

		// 	new google.maps.Marker({
		// 		position: center,
		// 		map: map,
		// 		icon : image
		// 	});

		// } );
	},

	clearMap : function() {

		$(".store-map").each( function(i, el) {

			if ($(el).hasClass("hidden")) {
				$(el).find(".map")
					.empty()
					.attr("style", "");
			}
		});
	},

	onMapClick : function(e) {
		e.preventDefault();

		var
			$target = $(e.currentTarget),
			$blockStore = $target.parents(".block-store"),

			images = $(".store-images", $blockStore),
			map = $(".store-map", $blockStore);

		images.toggleClass("hidden");
		map.toggleClass("hidden");

		if ( map.hasClass("hidden") ) {
			this.clearMap();
		} else {
			this.initMap();
		}

	},

	initMobile : function() {

		this.$container.find(".btn-more").on("click", $.proxy(this.onMoreClick, this));
	},

	onMoreClick : function(e) {

		e.preventDefault();
		$(e.currentTarget).parents(".col-right").toggleClass("open");
	},

	initNewsletter : function() {

		$(".form-newsletter").on("submit", $.proxy( ED.Newsletter.onSubmit, this ));
	}
};

/* globals Backbone, _, Facetr */

ED.PageTemplate.Main.Filters = ED.PageTemplate.Main.Filters || {

    $css : null,
    $container : null,
    $wrapper : null,
    $btns : null,
    $btnMain : null,
    $btnMobile : null,
    $btnDone : null,
    $btnClear : null,
    $filters : null,
    isFixed : false,
    collection : null,
    facet_collection : null,
    facets : {},

    numCols : null,
    colWidth : null,

    currentFilters : false,
    currentIds : [],
    available_filters : ['style', 'type', 'waist', 'length', 'size'],
    isModal : true,
    urlBase : '',

    init : function() {

        this.$container = $("#wrapper");
        this.$wrapper = $(".filters");
        this.$btns = $(".filters-cleaner");
        this.$btnMain = $(".btn-main-filter");
        this.$btnMobile = $(".btn-mobile-filter");
        this.$btnDone = $(".btn-done", this.$btns);
        this.$btnClear = $(".btn-clear", this.$btns);
        this.$filters = $(".btns-filter .btn-filter", this.$wrapper);
        this.$css = $('#filter-css');

        if (this.$css.length === 0) {
            this.$css = $('<style type="text/css"></style>').appendTo('head');
        }

        // setup the backbone collection
        this.collection = new Backbone.Collection(window.filter_collection);
        this.facet_collection = new Facetr(this.collection);

        var self = this;
        _.each(window.filter_facets, function (values, key) {
            self.facets[key] = self.facet_collection.facet(key);
        });

        this.addEvents();
        this.resize();

        this.urlBase = window.location.href.split('?')[0];

        this.onHandleFilterChangedURL();

        // OK open the panel
        if (!this.isModal && this.currentFilters) {
            this.toggleFilter(false);
        }
    },

    addEvents : function() {

        this.$btnMain.on("click", $.proxy(this.toggleFilter, this));
        this.$btnDone.on("click", $.proxy(this.toggleFilter, this));
        this.$btnClear.on("click", $.proxy(this.clearFilters, this));
        this.$btnMobile.on("click", $.proxy(this.toggleFilter, this));
        this.$filters.on("click", $.proxy(this.onFilterClick, this));

        this.$btnDone.on('click', $.proxy(this.onHandleModalAction, this));

        this.$container.on('transitionend webkitTransitionEnd oTransitionEnd otransitionend MSTransitionEnd', Utils.debounce(this.gridResize, 250));

        ED.EM.on('scrolled-after-header', $.proxy(this.onScrollEnterFixed, this));
        ED.EM.on('scrolled-before-header', $.proxy(this.onScrollLeaveFixed, this));
        ED.EM.on('filter-changed-url', $.proxy(this.onHandleFilterChangedURL, this));

    },

    onHandleFilterChangedURL : function () {
        var filters = this.buildFiltersFromUrl();

        // If they are new...
        if (filters !== this.currentFilters) {
            // OK update the current filters with the new ones
            this.currentFilters = filters;

            // Make the currently selected visible
            this.$filters.removeClass('selected');
            _.each(filters, function (value, key) {
                $('[data-f-'+key+'="'+value+'"]', this.$filters)
                    .addClass('selected');
            });

            // Now do the search...
            this.buildSearch();

            // Now tell the grid to update
            ED.EM.trigger( ED.Event.GRID_FILTERED, { ids: this.currentIds, animated: true } );

            // Make sure the main buttons get updated
            this.buildMainButtons();
        }

        // Update base url
        this.baseUrl = window.location.href.split('?')[0];
    },

    buildFiltersFromUrl : function () {
        var filters = {};
        var query = window.location.search.substr(1);
        if (query) {
            var bits = query.split('&');
            _.each(bits, function (bit) {
                var pair = bit.split('=');
                if (pair.length == 2 && _.indexOf(this.available_filters, pair[0])) {
                    filters[pair[0]] = decodeURIComponent(pair[1]);
                }
            });
        }
        if ($.isEmptyObject(filters)) {
            return false;
        }
        return filters;
    },

    buildSearch : function () {

        // Shortcut
        var self = this;

        // Reset the collection back to normal
        this.facet_collection.clearValues();

        // Apply all the filters to the collection
        _.each(this.currentFilters, function (value, key) {
            // Add a value to the faceter
            if (typeof self.facets[key] !== 'undefined') {
                self.facets[key].value(value.toString());
            }
        });

        // Tell me the ids of the items I have to show
        this.currentIds = this.collection.map(function (item) {
            return item.id;
        });

        // OK now tell the facets what are available and what aren't
        this.$filters.addClass('inactive');

        // First run of facet inactives
        this.facetInactives(false);

        // Now for all the facets available
        _.each(this.currentFilters, function (value, key) {

            // Kill the values (again, ready for more goodness)
            self.facet_collection.clearValues();

            // Build the filters that don't include myself
            var filters = _.clone(self.currentFilters);
            if (typeof filters[key] !== 'undefined') {
                delete filters[key];
            }

            // Apply all the filters to the result set
            _.each(filters, function (x, y) {
                if (typeof self.facets[y] !== 'undefined') {
                    self.facets[y].value(x.toString());
                }
            });

            // OK filter the facets BY the key
            self.facetInactives(key);
        });

    },

    buildUrl : function () {
        // We start with some hash...
        var url = '?';
        // then we add some filters
        _.each(this.currentFilters, function (value, key) {
            url += key+'='+encodeURIComponent(value)+'&';
        });
        // and finally we clip off the last &
        url = url.substr(0, url.length-1);
        var baseUrl = '/' + ED.Router.currentPage + ( ED.Router.currentPageSlug ? '/' + ED.Router.currentPageSlug : '' );
        // then we do our magic
        if (!ED.App.brwsr.ie9) {
            History.pushState({ filter: true }, document.title, baseUrl + url);
        } else {
            window.location.href = url;
        }
    },

    facetInactives : function (within) {
        // For all the facets
        _.each(this.facets, function (value, facet) {
            var should_proceed = false;
            // Global
            if (!within) {
                should_proceed = true;
            // OR is the facet within the scope?
            } else if (facet === within) {
                should_proceed = true;
            }
            // OK proceed...
            if (should_proceed) {
                var values = value.toJSON().values;
                // For all the values
                _.each(values, function (value) {
                    // Get the dom element
                    if (value.activeCount > 0) {
                        // Now remove the inactive class
                        $('[data-f-'+facet+'="'+value.value+'"]', this.$filters)
                            .removeClass('inactive');
                    }
                });
            }
        });
    },

    onFilterClick : function(e) {

        e.preventDefault();

        var
            $el = $(e.currentTarget),
            data = $el.data(),
            isInActive = $el.hasClass('inactive');

        if (!isInActive) {

            if (this.isFixed) {
                ED.Scroller.jump('.template-grid');
            }

            if ( $el.hasClass("selected") ) {

                $el.removeClass("selected");
                if (this.currentFilters !== false) {
                    delete this.currentFilters[ data["type"] ];
                }

            } else {

                $el.addClass("selected");
                // Make sure we're boolean...
                $('.btn', $el.parents('.btns-filter')).not($el).removeClass('selected');

                if (this.currentFilters === false) {
                    this.currentFilters = {};
                }
                this.currentFilters[data["type"]] = data["value"];
            }

            // When we're not in a modal...
            this.buildMainButtons();
            this.buildUrl();
            this.buildSearch();
            ED.EM.trigger( ED.Event.GRID_FILTERED, { ids: this.currentIds, animated: true } );

        }
    },

    buildMainButtons : function () {
        if (!this.currentFilters || $.isEmptyObject(this.currentFilters)) {
            this.$btnMain.removeClass("selected");
            this.$btnMobile.removeClass("selected");
            this.$btnClear.removeClass("selected");
        } else {
            this.$btnMain.addClass("selected");
            this.$btnMobile.addClass("selected");
            this.$btnClear.addClass("selected");
        }
    },

    clearFilters : function(e) {

        e.preventDefault();

        this.$btnMain.removeClass("selected");
        this.$btnMobile.removeClass("selected");
        this.$btnClear.removeClass("selected");

        $(".btns-filter .btn-filter.selected", this.$wrapper).removeClass("selected");
        this.currentFilters = {};

        if (!this.isModal) {
            this.buildMainButtons();
            this.buildUrl();
            this.buildSearch();

            ED.EM.trigger( ED.Event.GRID_FILTERED, { ids: this.currentIds, animated: true } );
        }
    },

    toggleFilter : function(e) {

        if (e) {
            e.preventDefault();
        }

        if (!this.$container.hasClass("filter-opened")) {
            this.$wrapper.scrollTop(0);
        }

        this.$container.toggleClass("filter-opened");
        $(".template-grid").toggleClass("filter-open");
        $(".block-btn-filter").toggleClass("hide");

        this.$btns.toggleClass("show");
        this.$wrapper.toggleClass("show");

        this.buildSearch();

        ED.EM.trigger( ED.Event.GRID_RESIZE );
        ED.EM.trigger( ED.Event.GRID_FILTERED, { ids: this.currentIds, animated: false } );
    },

    onHandleModalAction : function () {
        if (this.isModal) {
            this.buildMainButtons();
            this.buildUrl();
            this.buildSearch();
            ED.EM.trigger( ED.Event.GRID_FILTERED, { ids: this.currentIds, animated: true } );
        }
    },

    onScrollEnterFixed : function () {
        this.isFixed = true;
        this.$wrapper.addClass('fixed');
    },

    onScrollLeaveFixed : function () {
        this.isFixed = false;
        this.$wrapper.removeClass('fixed');
    },

    isOnlyGetParamsChanging : function () {
        var urlCheck = window.location.href.split('?')[0];
        return ( urlCheck === this.baseUrl );
    },

    gridResize : function () {
        ED.EM.trigger(ED.Event.GRID_RESIZE);
    },

    resize : function() {

        this.numCols = ED.App.getNumCols();
        this.colWidth = this.numCols > 2 ? Math.ceil($(".main-template").width() / this.numCols) + 1 : $(".main-template").width();

        this.isModal = ( ED.WIDTH <= 1024 );

        //

        if (this.isModal) {
            this.$wrapper.css('width', '');
            this.$btns.css('width', '');

            var height = ED.HEIGHT + 200;
            this.$css.html('.filters-cleaner { -moz-transform: translateY('+height+'px); -ms-transform: translateY('+height+'px); -webkit-transform: translateY('+height+'px); transform: translateY('+height+'px); }');
        } else {
            this.$css.html('');
            this.$wrapper
                .data("width", this.colWidth)
                .css("width", this.colWidth);
            this.$btns
                .data("width", this.colWidth)
                .css("width", this.colWidth);
        }

    }
};

/* globals EventChannel */

ED.PageTemplate.Main.Header = ED.PageTemplate.Main.Header || {

	$wrapper : null,
	maxHeight : 390,

	init : function() {

		this.$wrapper = $(".template-header");
		this.$bg = this.$wrapper.find(".header-background");
		this.$title = this.$wrapper.find("h2");
		this.$text = this.$wrapper.find("p");
		this.onScroll(0);

        EventChannel.on('scrolled', this.onScroll, this);
        // ED.EM.on( ED.Event.UPDATE_COOKIE, $.proxy( updateLangCookies, this ) );
	},

	onScroll : function( pos ) {

		var paralax = {};

		if ( ED.WIDTH <= 1024 ) {

			paralax = {
				"opacity" : "",
				"transform" : "",
				"background-position" : ""
			};

			this.$title.css(paralax);
			this.$text.css(paralax);
			this.$bg.css(paralax);

			return;
		}

		if ( pos > this.maxHeight ) return;

		paralax = {
			"opacity" : 1 - ( pos / this.maxHeight ),
			"transform" : "translateY(" + (-pos/4) + "px)"
		};

		this.$title.css(paralax);
		this.$text.css(paralax);

		var paralaxInvert = {
			"opacity" : 1 - ( pos / this.maxHeight ),
			"background-position" : "50% "+Utils.map( pos, 0, this.maxHeight, 100, 0 )+"%"
		};

		this.$bg.css(paralaxInvert);
	},

	resize : function() {

		// TODO recalculate this.maxHeight

		if ( ED.WIDTH < 1024 ) {

		} else {

		}
	}
};


ED.PageTemplate.Main.InfiniteLoader = ED.PageTemplate.Main.InfiniteLoader || {

	xhr : null,
	url : false,
	loading : false,
	offset : 300,
	$container : null,

	init : function($container) {

		this.$container = $container;
		this.url = $('.infinite-load-more', $container).prop('href');
		$(window).on('scroll', $.proxy(this.checkLoadMore, this));
		this.checkLoadMore();
	},

	checkLoadMore : function() {

		var check = $(document).height() - $(window).height() - this.offset;
		var scrollTop = $(window).scrollTop();
		if (scrollTop >= check) {
			this.handleLoadMore();
		}
	},

	handleLoadMore : function() {

		if ( !this.loading && this.url ) {
			this.loading = true;
			$('.infinite-load-more', this.$container).html('<span class="item-inside">Loading...</span>');
			var self = this;
			$.ajax({
				url : this.url,
				success : function(html) {
					var $html = $(html);
					var items = $('.item', $html);
					$('.infinite-load-more', self.$container).remove();
					items.appendTo(self.$container);
					self.url = $('.infinite-load-more', self.$container).prop('href');
					self.loading = false;
					ED.Grid.update();
					if ($('.image-loader', items).length > 0) {
						ED.ImageLoader.init();
					}
				}
			});
		}
	}

};


ED.PageTemplate.Main.Lookbook = ED.PageTemplate.Main.Lookbook || {

	$wrapper : null,
	$overlay : null,

	$carousel : null,
	carouselSwipe : null,
	$btnSwipe : null,
	imgs : null,
	imgLoaded : 0,

	init : function() {

		this.$wrapper = $(".lookbook");
		this.$overlay = this.$wrapper.find(".block-overlay");
		this.$overlayClose = this.$overlay.find(".overlay-close");
		this.$carousel = this.$wrapper.find(".block-carousel");
		this.$btnSwipe = this.$wrapper.find(".btn-swipe");
		this.imgs = this.$carousel.find("img");

		this.$wrapper.find(".template-grid .grid-item")
			.on("click", $.proxy(this.onGridClick, this));

		this.$wrapper.find(".btn-toggle-hotspot")
			.on("click", $.proxy(this.toggleHotspots, this));

		this.$wrapper.find(".btn-hotspot")
			.on("click", $.proxy(this.toggleDetails, this));

		this.$wrapper.find(".close-area")
			.on("click", $.proxy(this.onCloseOverlay, this));

		this.$btnSwipe.on("click", $.proxy(this.onBtnSwipe, this));
		this.$overlayClose.on("click", $.proxy(this.onCloseOverlay, this));

		$(document).on("keyup", $.proxy(this.onKeyUp, this));

		this.imgLoaded = 0;
		this.waitforload();
	},

	onKeyUp : function(e) {

		if ( e.keyCode == 37 ) {
			if (this.carouselSwipe) this.carouselSwipe.prev();
		} else if ( e.keyCode == 39 ) {
			if (this.carouselSwipe) this.carouselSwipe.next();
		} else if ( e.keyCode == 27 ) {
			this.onCloseOverlay( e );
		}
	},

	toggleHotspots : function(e) {

		e.preventDefault();

		this.cleanUpHotspots();
		$(e.currentTarget).toggleClass("selected");
		$(e.currentTarget).parent().toggleClass("show-hotspots");
	},

	onGridClick : function(e) {

		e.preventDefault();

		if ( ED.WIDTH < 767 ) {
			return;
		}

		var
			self = this,
			startIndex = $(e.currentTarget).data("index");

		this.$overlay.show(0, function() {

			self.carouselSwipe = new Swipe( self.$carousel[0], {
				speed : 1000,
				startSlide : startIndex,
				callback : $.proxy( self.positionArrows, self )
			} );

			self.resize();
			self.disableScroll();
		});
	},

	positionArrows : function() {

		if ( !this.carouselSwipe ) return;

		var
			imgIndex = this.carouselSwipe.getPos(),
			refWidth = this.$overlay.width(),
			imgWidth = this.$overlay.find("img:eq("+imgIndex+")").width(),
			offset = Math.round((refWidth - imgWidth) / 4);

		$(".btn-swipe.btn-prev").css("left", offset - 13);
		$(".btn-swipe.btn-next").css("right", offset - 13);
	},

	toggleDetails : function(e) {

		e.preventDefault();

		var
			$el = $(e.currentTarget),
			$hotspots = $el.parent(),
			$details = $hotspots.find(".hotspot-detail"),
			name = $el.data("title"),
			target = $el.data("link");

		if ( $el.hasClass("open") ) {
			this.cleanUpHotspots();
			return;
		}

		// Clean up old classes
		this.cleanUpHotspots();

		// Populate details
		$details.find("h5").text(name);
		$details.find("a").attr("href", target);

		// TODO
		// Add position of the details
		$details.css({
			"top" : $el.css("top"),
			"left" : $el.css("left")
		});

		// add point-left // point-right
		if ( parseInt($el.css("left")) < ($hotspots.parent().find("img").width() / 2) ) {
			$details
				.addClass("point-left")
				.css("transform", "translate(28px, " + (-$details.height() / 2) + "px)");
		} else {
			$details
				.addClass("point-right")
				.css("transform", "translate(" + (-$details.width()-28) + "px, " + (-$details.height() / 2) + "px)");
		}

		// render
		$el.addClass("open");
		$details.addClass("visible");
	},

	cleanUpHotspots : function() {

		$(".btn-hotspot.open").removeClass("open");
		$(".hotspot-detail")
			.removeClass("point-right")
			.removeClass("point-left")
			.removeClass("visible");
	},

	onBtnSwipe : function(e) {

		e.preventDefault();

		var $el = $(e.currentTarget);

		if ( $el.hasClass("btn-prev") ) {
			if (this.carouselSwipe) this.carouselSwipe.prev();
		} else if ( $el.hasClass("btn-next") ) {
			if (this.carouselSwipe) this.carouselSwipe.next();
		}

	},

	waitforload : function() {

		var self = this;

		this.imgs.each( function(i, img) {
			$(img).on("load", function() {
				self.imgLoaded++;
				self.checkImgLoaded();
			});
		} );
	},

	checkImgLoaded : function() {

		if ( this.imgLoaded == this.imgs.length - 1 ) {
			this.initHotspots();
		}
	},

	initHotspots : function() {

		this.positionHotspots();
	},

	positionHotspots : function() {

		var
			refImg, refW, refH,
			$block;

		$(".hotspots").each(function( i, block ) {

			$block = $(block);
			refImg = $block.prev("img");
			refW = refImg.width();
			refH = refImg.height();

			$block.css({
				"width" : refW,
				"height" : refH,
				"margin-top" : -(refH*0.5),
				"margin-left" : -(refW*0.5)
			});

		});
	},

	onCloseOverlay : function(e) {

		e.preventDefault();

		this.$overlay.hide();
		if (this.carouselSwipe) this.carouselSwipe.kill();
		this.carouselSwipe = null;
		this.enableScroll();

	},

	disableScrollKeydown : function (e) {

		var keys = [32, 33, 34, 35, 36, 38, 40];
		if ($.inArray(e.keyCode, keys)) {
			e.preventDefault();
		}
	},

	devNull : function () {

		return;
	},

	disableScroll : function () {

		$(window).on('mousewheel', this.devNull);
		$(document).on('keydown', this.disableScrollKeydown);
	},

	enableScroll : function () {

		$(window).off('mousewheel', this.devNull);
		$(document).off('keydown', this.disableScrollKeydown);
	},

	resize : function() {

		this.positionHotspots();
		this.positionArrows();
	}
};


ED.PageTemplate.Main.TopMenu = ED.PageTemplate.Main.TopMenu || {

    $wrapper : null,
    $selector : null,
    hasEvents : false,

    init : function() {

        this.$wrapper = $(".top-menu");
        this.$ul = this.$wrapper.find("ul");
        this.$selector = $(".selector");

        if ( !this.hasEvents ) {
            this.hasEvents = true;
            this.$ul.find("a")
                .on("mouseenter", $.proxy(this.onMouseEnterTopMenu, this))
                .on("mouseleave", $.proxy(this.onMouseLeaveTopMenu, this));

            if ( !ED.App.brwsr.ie9 ) {
                this.$ul.find('a').on("click", $.proxy(this.onClickTopMenu, this));
            }
        }

        this.resize();
    },

    resetSelector : function() {

        this.positionSelector( this.$wrapper.find(".selected") );
    },

    positionSelector : function( $item ) {

        this.$selector.css({
            "left" : $item.position().left + 10 + this.$wrapper.scrollLeft(),
            "width" : $item.width() - 20
        });
    },

    onClickTopMenu : function(e) {

        e.preventDefault();

        var
            $el = $(e.currentTarget),
            target = $el.attr("href");

        this.$wrapper.find(".selected").removeClass("selected");
        $el.parent().addClass("selected");

        History.pushState({ partial : true }, document.title, target );
    },

    onMouseEnterTopMenu : function(e) {

        this.positionSelector( $(e.currentTarget).parent() );
    },

    onMouseLeaveTopMenu : function() {

        this.resetSelector();
    },

    resize : function() {

        if ( ED.WIDTH < 1024 ) {

            var w = 0;
            this.$ul.find("li").each( function ( i, el ) {
                w += $(el).width() + 5;
            } );

            if ( w > ED.WIDTH )
                this.$ul.css("width", w);
            else
                this.$ul.css("width", "");

        } else {
            this.$ul.css("width", "");
        }

        this.resetSelector();
    }
};

/**
 * Conduit.js
 * repo: https://github.com/f5io/conduit-js
 * author: Joe Harlow (joe@f5.io)
 */
(function(w) {

    'use strict';

    var _ = {
        fps : 60,
        rafLast : 0,
        requestAnimFrame : (function(){
            return  w.requestAnimationFrame         ||
                    w.webkitRequestAnimationFrame   ||
                    w.mozRequestAnimationFrame      ||
                    function(callback) {
                        var currTime = new Date().getTime();
                        var timeToCall = Math.max(0, 16 - (currTime - _.rafLast));
                        var id = w.setTimeout(function() { callback(currTime + timeToCall); }, timeToCall);
                        _.rafLast = currTime + timeToCall;
                        return id;
                    };
        })(),
        cancelAnimFrame : (function() {
            return  w.cancelAnimationFrame              ||
                    w.cancelRequestAnimationFrame       ||
                    w.webkitCancelAnimationFrame        ||
                    w.webkitCancelRequestAnimationFrame ||
                    w.mozCancelAnimationFrame           ||
                    w.mozCancelRequestAnimationFrame    ||
                    function(id) {
                        clearTimeout(id);
                    };
        })()
    };

    function tick() {
        var _t = cD;
        _t.raf = _.requestAnimFrame.call(w, tick);
        _t.now = new Date().getTime();
        _t.delta = _t.now - _t.then;
        if (_t.delta > _t.interval) {
            for (var n in _t.pipeline) {
                if (_t.pipeline.hasOwnProperty(n)) _t.pipeline[n](_t.delta);
            }
            _t.then = _t.now - (_t.delta % _t.interval);
        }
    }

    var Conduit = function() {
        var _t = this;
        _t.pipeline = {};
        _t.then = new Date().getTime();
        _t.now = undefined;
        _t.raf = undefined;
        _t.delta = undefined;
        _t.interval = 1000 / _.fps;
        _t.running = false;
    };

    Conduit.prototype = {
        add : function(name, fn) {
            this.pipeline[name] = fn;
            return this;
        },
        remove : function(name) {
            delete this.pipeline[name];
            return this;
        },
        start : function(fps) {
            if (!this.running) {
                _.fps = fps || _.fps;
                this.interval = 1000 / _.fps;
                tick();
                this.running = true;
            }
            return this;
        },
        pause : function() {
            if (this.running) {
                _.cancelAnimFrame.call(w, this.raf);
                this.running = false;
            }
            return this;
        },
        setFPS : function(fps) {
            _.fps = fps;
            this.interval = 1000 / _.fps;
            return this;
        }
    };

    var cD = new Conduit();

    w.Conduit = w.cD = cD;

})(window);
/* globals performance, define */

/**
 * Tween.js - Licensed under the MIT license
 * https://github.com/sole/tween.js
 * ----------------------------------------------
 *
 * See https://github.com/sole/tween.js/graphs/contributors for the full list of contributors.
 * Thank you all, you're awesome!
 */

// performance.now polyfill
( function ( root ) {

    if ( 'performance' in root === false ) {
        root.performance = {};
    }

    // IE 8
    Date.now = ( Date.now || function () {
        return new Date().getTime();
    } );

    if ( 'now' in root.performance === false ) {
        var offset = root.performance.timing && root.performance.timing.navigationStart ? performance.timing.navigationStart
                                                                                        : Date.now();

        root.performance.now = function () {
            return Date.now() - offset;
        };
    }

} )( this );

var TWEEN = TWEEN || ( function () {

    var _tweens = [];

    return {

        REVISION: '14',

        getAll: function () {

            return _tweens;

        },

        removeAll: function () {

            _tweens = [];

        },

        add: function ( tween ) {

            _tweens.push( tween );

        },

        remove: function ( tween ) {

            var i = _tweens.indexOf( tween );

            if ( i !== -1 ) {

                _tweens.splice( i, 1 );

            }

        },

        update: function ( time ) {

            if ( _tweens.length === 0 ) return false;

            var i = 0;

            time = time !== undefined ? time : window.performance.now();

            while ( i < _tweens.length ) {

                if ( _tweens[ i ].update( time ) ) {

                    i++;

                } else {

                    _tweens.splice( i, 1 );

                }

            }

            return true;

        }
    };

} )();

TWEEN.Tween = function ( object ) {

    var _object = object;
    var _valuesStart = {};
    var _valuesEnd = {};
    var _valuesStartRepeat = {};
    var _duration = 1000;
    var _repeat = 0;
    var _yoyo = false;
    var _isPlaying = false;
    var _reversed = false;
    var _delayTime = 0;
    var _startTime = null;
    var _easingFunction = TWEEN.Easing.Linear.None;
    var _interpolationFunction = TWEEN.Interpolation.Linear;
    var _chainedTweens = [];
    var _onStartCallback = null;
    var _onStartCallbackFired = false;
    var _onUpdateCallback = null;
    var _onCompleteCallback = null;
    var _onStopCallback = null;

    // Set all starting values present on the target object
    for ( var field in object ) {

        _valuesStart[ field ] = parseFloat(object[field], 10);

    }

    this.to = function ( properties, duration ) {

        if ( duration !== undefined ) {

            _duration = duration;

        }

        _valuesEnd = properties;

        return this;

    };

    this.start = function ( time ) {

        TWEEN.add( this );

        _isPlaying = true;

        _onStartCallbackFired = false;

        _startTime = time !== undefined ? time : window.performance.now();
        _startTime += _delayTime;

        for ( var property in _valuesEnd ) {

            // check if an Array was provided as property value
            if ( _valuesEnd[ property ] instanceof Array ) {

                if ( _valuesEnd[ property ].length === 0 ) {

                    continue;

                }

                // create a local copy of the Array with the start value at the front
                _valuesEnd[ property ] = [ _object[ property ] ].concat( _valuesEnd[ property ] );

            }

            _valuesStart[ property ] = _object[ property ];

            if( ( _valuesStart[ property ] instanceof Array ) === false ) {
                _valuesStart[ property ] *= 1.0; // Ensures we're using numbers, not strings
            }

            _valuesStartRepeat[ property ] = _valuesStart[ property ] || 0;

        }

        return this;

    };

    this.stop = function () {

        if ( !_isPlaying ) {
            return this;
        }

        TWEEN.remove( this );
        _isPlaying = false;

        if ( _onStopCallback !== null ) {

            _onStopCallback.call( _object );

        }

        this.stopChainedTweens();
        return this;

    };

    this.stopChainedTweens = function () {

        for ( var i = 0, numChainedTweens = _chainedTweens.length; i < numChainedTweens; i++ ) {

            _chainedTweens[ i ].stop();

        }

    };

    this.delay = function ( amount ) {

        _delayTime = amount;
        return this;

    };

    this.repeat = function ( times ) {

        _repeat = times;
        return this;

    };

    this.yoyo = function( yoyo ) {

        _yoyo = yoyo;
        return this;

    };


    this.easing = function ( easing ) {

        _easingFunction = easing;
        return this;

    };

    this.interpolation = function ( interpolation ) {

        _interpolationFunction = interpolation;
        return this;

    };

    this.chain = function () {

        _chainedTweens = arguments;
        return this;

    };

    this.onStart = function ( callback ) {

        _onStartCallback = callback;
        return this;

    };

    this.onUpdate = function ( callback ) {

        _onUpdateCallback = callback;
        return this;

    };

    this.onComplete = function ( callback ) {

        _onCompleteCallback = callback;
        return this;

    };

    this.onStop = function ( callback ) {

        _onStopCallback = callback;
        return this;

    };

    this.update = function ( time ) {

        var property;

        if ( time < _startTime ) {

            return true;

        }

        if ( _onStartCallbackFired === false ) {

            if ( _onStartCallback !== null ) {

                _onStartCallback.call( _object );

            }

            _onStartCallbackFired = true;

        }

        var elapsed = ( time - _startTime ) / _duration;
        elapsed = elapsed > 1 ? 1 : elapsed;

        var value = _easingFunction( elapsed );

        for ( property in _valuesEnd ) {

            var start = _valuesStart[ property ] || 0;
            var end = _valuesEnd[ property ];

            if ( end instanceof Array ) {

                _object[ property ] = _interpolationFunction( end, value );

            } else {

                // Parses relative end values with start as base (e.g.: +10, -3)
                if ( typeof(end) === "string" ) {
                    end = start + parseFloat(end, 10);
                }

                // protect against non numeric properties.
                if ( typeof(end) === "number" ) {
                    _object[ property ] = start + ( end - start ) * value;
                }

            }

        }

        if ( _onUpdateCallback !== null ) {

            _onUpdateCallback.call( _object, value );

        }

        if ( elapsed == 1 ) {

            if ( _repeat > 0 ) {

                if( isFinite( _repeat ) ) {
                    _repeat--;
                }

                // reassign starting values, restart by making startTime = now
                for( property in _valuesStartRepeat ) {

                    if ( typeof( _valuesEnd[ property ] ) === "string" ) {
                        _valuesStartRepeat[ property ] = _valuesStartRepeat[ property ] + parseFloat(_valuesEnd[ property ], 10);
                    }

                    if (_yoyo) {
                        var tmp = _valuesStartRepeat[ property ];
                        _valuesStartRepeat[ property ] = _valuesEnd[ property ];
                        _valuesEnd[ property ] = tmp;
                    }

                    _valuesStart[ property ] = _valuesStartRepeat[ property ];

                }

                if (_yoyo) {
                    _reversed = !_reversed;
                }

                _startTime = time + _delayTime;

                return true;

            } else {

                if ( _onCompleteCallback !== null ) {

                    _onCompleteCallback.call( _object );

                }

                for ( var i = 0, numChainedTweens = _chainedTweens.length; i < numChainedTweens; i++ ) {

                    _chainedTweens[ i ].start( time );

                }

                return false;

            }

        }

        return true;

    };

};


TWEEN.Easing = {

    Linear: {

        None: function ( k ) {

            return k;

        }

    },

    Quadratic: {

        In: function ( k ) {

            return k * k;

        },

        Out: function ( k ) {

            return k * ( 2 - k );

        },

        InOut: function ( k ) {

            if ( ( k *= 2 ) < 1 ) return 0.5 * k * k;
            return - 0.5 * ( --k * ( k - 2 ) - 1 );

        }

    },

    Cubic: {

        In: function ( k ) {

            return k * k * k;

        },

        Out: function ( k ) {

            return --k * k * k + 1;

        },

        InOut: function ( k ) {

            if ( ( k *= 2 ) < 1 ) return 0.5 * k * k * k;
            return 0.5 * ( ( k -= 2 ) * k * k + 2 );

        }

    },

    Quartic: {

        In: function ( k ) {

            return k * k * k * k;

        },

        Out: function ( k ) {

            return 1 - ( --k * k * k * k );

        },

        InOut: function ( k ) {

            if ( ( k *= 2 ) < 1) return 0.5 * k * k * k * k;
            return - 0.5 * ( ( k -= 2 ) * k * k * k - 2 );

        }

    },

    Quintic: {

        In: function ( k ) {

            return k * k * k * k * k;

        },

        Out: function ( k ) {

            return --k * k * k * k * k + 1;

        },

        InOut: function ( k ) {

            if ( ( k *= 2 ) < 1 ) return 0.5 * k * k * k * k * k;
            return 0.5 * ( ( k -= 2 ) * k * k * k * k + 2 );

        }

    },

    Sinusoidal: {

        In: function ( k ) {

            return 1 - Math.cos( k * Math.PI / 2 );

        },

        Out: function ( k ) {

            return Math.sin( k * Math.PI / 2 );

        },

        InOut: function ( k ) {

            return 0.5 * ( 1 - Math.cos( Math.PI * k ) );

        }

    },

    Exponential: {

        In: function ( k ) {

            return k === 0 ? 0 : Math.pow( 1024, k - 1 );

        },

        Out: function ( k ) {

            return k === 1 ? 1 : 1 - Math.pow( 2, - 10 * k );

        },

        InOut: function ( k ) {

            if ( k === 0 ) return 0;
            if ( k === 1 ) return 1;
            if ( ( k *= 2 ) < 1 ) return 0.5 * Math.pow( 1024, k - 1 );
            return 0.5 * ( - Math.pow( 2, - 10 * ( k - 1 ) ) + 2 );

        }

    },

    Circular: {

        In: function ( k ) {

            return 1 - Math.sqrt( 1 - k * k );

        },

        Out: function ( k ) {

            return Math.sqrt( 1 - ( --k * k ) );

        },

        InOut: function ( k ) {

            if ( ( k *= 2 ) < 1) return - 0.5 * ( Math.sqrt( 1 - k * k) - 1);
            return 0.5 * ( Math.sqrt( 1 - ( k -= 2) * k) + 1);

        }

    },

    Elastic: {

        In: function ( k ) {

            var s, a = 0.1, p = 0.4;
            if ( k === 0 ) return 0;
            if ( k === 1 ) return 1;
            if ( !a || a < 1 ) { a = 1; s = p / 4; }
            else s = p * Math.asin( 1 / a ) / ( 2 * Math.PI );
            return - ( a * Math.pow( 2, 10 * ( k -= 1 ) ) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) );

        },

        Out: function ( k ) {

            var s, a = 0.1, p = 0.4;
            if ( k === 0 ) return 0;
            if ( k === 1 ) return 1;
            if ( !a || a < 1 ) { a = 1; s = p / 4; }
            else s = p * Math.asin( 1 / a ) / ( 2 * Math.PI );
            return ( a * Math.pow( 2, - 10 * k) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) + 1 );

        },

        InOut: function ( k ) {

            var s, a = 0.1, p = 0.4;
            if ( k === 0 ) return 0;
            if ( k === 1 ) return 1;
            if ( !a || a < 1 ) { a = 1; s = p / 4; }
            else s = p * Math.asin( 1 / a ) / ( 2 * Math.PI );
            if ( ( k *= 2 ) < 1 ) return - 0.5 * ( a * Math.pow( 2, 10 * ( k -= 1 ) ) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) );
            return a * Math.pow( 2, -10 * ( k -= 1 ) ) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) * 0.5 + 1;

        }

    },

    Back: {

        In: function ( k ) {

            var s = 1.70158;
            return k * k * ( ( s + 1 ) * k - s );

        },

        Out: function ( k ) {

            var s = 1.70158;
            return --k * k * ( ( s + 1 ) * k + s ) + 1;

        },

        InOut: function ( k ) {

            var s = 1.70158 * 1.525;
            if ( ( k *= 2 ) < 1 ) return 0.5 * ( k * k * ( ( s + 1 ) * k - s ) );
            return 0.5 * ( ( k -= 2 ) * k * ( ( s + 1 ) * k + s ) + 2 );

        }

    },

    Bounce: {

        In: function ( k ) {

            return 1 - TWEEN.Easing.Bounce.Out( 1 - k );

        },

        Out: function ( k ) {

            if ( k < ( 1 / 2.75 ) ) {

                return 7.5625 * k * k;

            } else if ( k < ( 2 / 2.75 ) ) {

                return 7.5625 * ( k -= ( 1.5 / 2.75 ) ) * k + 0.75;

            } else if ( k < ( 2.5 / 2.75 ) ) {

                return 7.5625 * ( k -= ( 2.25 / 2.75 ) ) * k + 0.9375;

            } else {

                return 7.5625 * ( k -= ( 2.625 / 2.75 ) ) * k + 0.984375;

            }

        },

        InOut: function ( k ) {

            if ( k < 0.5 ) return TWEEN.Easing.Bounce.In( k * 2 ) * 0.5;
            return TWEEN.Easing.Bounce.Out( k * 2 - 1 ) * 0.5 + 0.5;

        }

    }

};

TWEEN.Interpolation = {

    Linear: function ( v, k ) {

        var m = v.length - 1, f = m * k, i = Math.floor( f ), fn = TWEEN.Interpolation.Utils.Linear;

        if ( k < 0 ) return fn( v[ 0 ], v[ 1 ], f );
        if ( k > 1 ) return fn( v[ m ], v[ m - 1 ], m - f );

        return fn( v[ i ], v[ i + 1 > m ? m : i + 1 ], f - i );

    },

    Bezier: function ( v, k ) {

        var b = 0, n = v.length - 1, pw = Math.pow, bn = TWEEN.Interpolation.Utils.Bernstein, i;

        for ( i = 0; i <= n; i++ ) {
            b += pw( 1 - k, n - i ) * pw( k, i ) * v[ i ] * bn( n, i );
        }

        return b;

    },

    CatmullRom: function ( v, k ) {

        var m = v.length - 1, f = m * k, i = Math.floor( f ), fn = TWEEN.Interpolation.Utils.CatmullRom;

        if ( v[ 0 ] === v[ m ] ) {

            if ( k < 0 ) i = Math.floor( f = m * ( 1 + k ) );

            return fn( v[ ( i - 1 + m ) % m ], v[ i ], v[ ( i + 1 ) % m ], v[ ( i + 2 ) % m ], f - i );

        } else {

            if ( k < 0 ) return v[ 0 ] - ( fn( v[ 0 ], v[ 0 ], v[ 1 ], v[ 1 ], -f ) - v[ 0 ] );
            if ( k > 1 ) return v[ m ] - ( fn( v[ m ], v[ m ], v[ m - 1 ], v[ m - 1 ], f - m ) - v[ m ] );

            return fn( v[ i ? i - 1 : 0 ], v[ i ], v[ m < i + 1 ? m : i + 1 ], v[ m < i + 2 ? m : i + 2 ], f - i );

        }

    },

    Utils: {

        Linear: function ( p0, p1, t ) {

            return ( p1 - p0 ) * t + p0;

        },

        Bernstein: function ( n , i ) {

            var fc = TWEEN.Interpolation.Utils.Factorial;
            return fc( n ) / fc( i ) / fc( n - i );

        },

        Factorial: ( function () {

            var a = [ 1 ];

            return function ( n ) {

                var s = 1, i;
                if ( a[ n ] ) return a[ n ];
                for ( i = n; i > 1; i-- ) s *= i;
                return a[ n ] = s;

            };

        } )(),

        CatmullRom: function ( p0, p1, p2, p3, t ) {

            var v0 = ( p2 - p0 ) * 0.5, v1 = ( p3 - p1 ) * 0.5, t2 = t * t, t3 = t * t2;
            return ( 2 * p1 - 2 * p2 + v0 + v1 ) * t3 + ( - 3 * p1 + 3 * p2 - 2 * v0 - v1 ) * t2 + v0 * t + p1;

        }

    }

};

// UMD (Universal Module Definition)
( function ( root ) {

    if ( typeof define === 'function' && define.amd ) {

        // AMD
        define( [], function () {
            return TWEEN;
        } );

    } else if ( typeof exports === 'object' ) {

        // Node.js
        module.exports = TWEEN;

    } else {

        // Global variable
        root.TWEEN = TWEEN;

    }

} )( this );

/* globals jQuery */

/*
    By Osvaldas Valutis, www.osvaldas.info
    Available for use under the MIT License
*/

window.googleMapsScriptLoaded = function()
{
    $( window ).trigger( 'googleMapsScriptLoaded' );
};

;( function( $, window, document, undefined )
{
    'use strict';

    var $window         = $( window ),
        $body           = $( 'body' ),
        windowHeight    = $window.height(),
        windowScrollTop = 0,

        debounce = function( delay, fn )
        {
            var timer = null;
            return function()
            {
                var context = this, args = arguments;
                clearTimeout( timer );
                timer = setTimeout( function(){ fn.apply( context, args ); }, delay );
            };
        },
        throttle = function( delay, fn )
        {
            var last, deferTimer;
            return function()
            {
                var context = this, args = arguments, now = +new Date();
                if( last && now < last + delay )
                {
                    clearTimeout( deferTimer );
                    deferTimer = setTimeout( function(){ last = now; fn.apply( context, args ); }, delay );
                }
                else
                {
                    last = now;
                    fn.apply( context, args );
                }
            };
        },

        apiScriptLoaded  = false,
        apiScriptLoading = false,
        $containers      = $([]),

        init = function(  )
        {
            windowScrollTop = $window.scrollTop();

            $containers.each( function()
            {
                var $this       = $( this ),
                    thisOptions = $this.data( 'options' );

                if( $this.offset().top - windowScrollTop > windowHeight * 1 )
                    return true;

                if( !apiScriptLoaded && !apiScriptLoading )
                {
                    $body.append( '<script src="https://maps.googleapis.com/maps/api/js?v=3.exp&callback=googleMapsScriptLoaded' + ( thisOptions.api_key ? ( '&key=' + thisOptions.api_key ) : '' ) + '"></script>' );
                    apiScriptLoading = true;
                }

                if( !apiScriptLoaded ) return true;

                var map = new google.maps.Map( this, { zoom: 15 });
                if( thisOptions.callback !== false )
                    thisOptions.callback( this, map );

                $containers = $containers.not( $this );
            });
        };

    $window
    .on( 'googleMapsScriptLoaded',function()
    {
        apiScriptLoaded = true;
        init();
    })
    .on( 'scroll', throttle( 500, init ) )
    .on( 'resize', debounce( 1000, function()
    {
        windowHeight = $window.height();
        init();
    }));

    $.fn.lazyLoadGoogleMaps = function( options )
    {
        options = $.extend(
                    {
                        api_key:  false,
                        callback: false,
                    },
                    options );

        this.each( function()
        {
            var $this = $( this );
            $this.data( 'options', options );
            $containers = $containers.add( $this );
        });

        init();

        this.debounce = debounce;
        this.throttle = throttle;

        return this;
    };

})( jQuery, window, document );

// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating

// requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel

// MIT license

(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); },
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };

    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());
