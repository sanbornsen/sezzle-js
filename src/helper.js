var cloneDeep = require('lodash.clonedeep')

/**
 * This is a function to validate configs
 * @param options new config to validate
 * @return nothing. If config is invalid, error is thrown and program execution is stopped.
 */
exports.validateConfig = function(options) {
	if(!Array.isArray(options.configGroups)) {
		throw new Error("options.configGroups must be an array");
	} else {
		if(!options.configGroups.length) {
			throw new Error("options.configGroups must have at least one config object");
		}
	}

	// checking fields which MUST be specified in configGroups. (Only one as of now really :D)
	const mustInclude = ["targetXPath"];
	options.configGroups.forEach(function(group) {
		mustInclude.forEach(function(field) {
			if(!group.hasOwnProperty(field)) {
				throw new Error(field + " must be specified in all configs in options.configGroups");
			}
		});
	});

	// type checks for crucial fields

	// expected types for crucial fields in the config
	// may do type checking for all fields in the future but it's just not necessary as of now
	const expectedTypes = {
		"targetXPath": "string",
		"renderToPath": "string",
		"urlMatch": "string"
	}
	options.configGroups.forEach(function(group) {
		Object.keys(expectedTypes).forEach(function(key) {
			if(group.hasOwnProperty(key) && typeof(group[key]) !== expectedTypes[key]) {
				throw new Error(key + " must be of type " + expectedTypes[key]);
			}
		});
	});

	// properties that do not belong to a config group (must have been factorized before)
	const propsNotInConfigGroup = [
		"merchantID", 
		"forcedShow", 
		"minPrice", 
		"maxPrice", 
		"numberOfPayments", 
		"altLightboxHTML", 
		"apModalHTML", 
		"qpModalHTML",
		"noGtm",
		"noTracking",
		"testID"
	];

	// check correct factorization
	options.configGroups.forEach(function(group) {
		Object.keys(group).forEach(function(key) {
			if(propsNotInConfigGroup.includes(key)) {
				throw new Error(key + " is not a property of a configGroup. Specify this key at the outermost layer");
			}
		});
	});

	// if control reaches this point, the config is acceptable. It may not be perfect since the checks
	// are pretty loose, but at least the crucial parts of it are OK. May add more checks in the future.
	return;
}


/**
 * This is a helper function to convert an old
 * config passed into SezzleJS' constructor to a 
 * new one which is compatible with the current
 * SezzleJS version. In other words, this
 * function is used for backwards compatability 
 * with older versions.
 * @param options old config passed into SezzleJS' constructor
 * @return compatible object with current SezzleJS version
 */
exports.makeCompatible = function(options) {
	// place fields which do not belong in a group outside of configGroups
	var compatible = exports.factorize(options);
	// split the configs up if necessary
	compatible.configGroups = exports.splitConfig(options);
	// should we factorize common field values and place in defaultConfig? I don't think so
	return compatible;
}

/**
 * Function to split configs up according to the targetXPath
 * Every config should have at most one targetXPath.
 * @param options Old config
 * @return split array of configs
 */
exports.splitConfig = function(options) {
	var res = [];
	if(typeof (options.targetXPath)!== 'undefined') {
		// everything revolves around an xpath
		if(Array.isArray(options.targetXPath)) {
			// group up custom classes according to index
			var groupedCustomClasses = [];
			if(options.customClasses) {
				options.customClasses.forEach(function(customClass) {
					if(typeof (customClass.targetXPathIndex) === 'number') {
						if(typeof (groupedCustomClasses[customClass.targetXPathIndex]) === 'undefined') {
							groupedCustomClasses[customClass.targetXPathIndex] = [customClass];
						} else {
							groupedCustomClasses[customClass.targetXPathIndex].push(customClass);
						}
						delete customClass.targetXPathIndex;
					}
				})
			}

			// need to ensure it's array and not string so that code doesnt mistakenly separate chars
			var renderToPathIsArray = Array.isArray(options.renderToPath);
			// a group should revolve around targetXPath
			// break up the array, starting from the first element
			options.targetXPath.forEach(function(xpath, inner) {
				// deep clone as config may have nested objects
				var config = cloneDeep(options);

				// overwrite targetXPath
				config.targetXPath = xpath;

				// sync up renderToPath array
				if(renderToPathIsArray && typeof (options.renderToPath[inner]) !== 'undefined') {
					config.renderToPath = options.renderToPath[inner] ? options.renderToPath[inner] : null;
				} else {
					// by default, below parent of target
					config.renderToPath = "..";
				}

				// sync up relatedElementActions array
				if(options.relatedElementActions && 
					typeof (options.relatedElementActions[inner]) !== 'undefined' && 
					Array.isArray(options.relatedElementActions[inner])) {
					config.relatedElementActions = options.relatedElementActions[inner];
				}

				// sync up customClasses
				if(typeof (groupedCustomClasses[inner]) !== 'undefined') {
					config.customClasses = groupedCustomClasses[inner];
				}

				// duplicate ignoredPriceElements string / array if exists
				if(options.ignoredPriceElements) {
					config.ignoredPriceElements = options.ignoredPriceElements;
				}

				// that's all, append
				res.push(config);
			});
		} else {
			// must be a single string
			res.push(options);
		}
	}
	return res;
}

/**
 * This is a helper function to move fields which do not belong to a
 * config group outside of the group and also place them outside 
 * configGroups in order to be compatible with latest structure. 
 * @param options old sezzle config
 * @return Factorized fields
 */
exports.factorize = function(options) {
	const fieldsToFactorize = [
		"merchantID", 
		"forcedShow", 
		"minPrice", 
		"maxPrice", 
		"numberOfPayments", 
		"altLightboxHTML", 
		"apModalHTML", 
		"qpModalHTML",
		"noGtm",
		"noTracking",
		"testID"
	];

	var factorized = {};

	// assumption is being made that all these fields are the same across all config groups
	// it is a reasonable assumption to make as :
	// - one config as a whole should only be assigned to one merchantID
	// - forcedShow is only useful if the country in which the widget is served is not in the supported list
	//   so it's reasonable to assume that forcedShow should be the same value for all configs
	// - as the widget only supports one modal currently, there is no capability of loading multiple modals

	fieldsToFactorize.forEach(function(field) {
		if(options[field] !== undefined) {
			factorized[field] = options[field];
			delete options[field];
		}
	});

	return factorized;
}

/**
 * This is helper function for formatPrice
 * @param n char value
 * @return boolean [if it's numeric or not]
 */
exports.isNumeric = function (n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

/**
 * This is a helper function to break xpath into array
 * @param xpath string Ex: './.class1/#id'
 * @returns string[] Ex: ['.', '.class', '#id']
 */
exports.breakXPath = function(xpath) {
  return xpath.split('/')
    .filter(function(subpath) {
      return subpath !== ''
    });
}

/**
 * This is helper function for formatPrice
 * @param n char value
 * @return boolean [if it's alphabet or not]
 */
exports.isAlphabet = function (n) {
  return /^[a-zA-Z()]+$/.test(n);
}

/**
 * This function will return the price string
 * @param price - string value
 * @param includeComma - comma should be added to the string or not
 * @return string
 */
exports.parsePriceString = function (price, includeComma) {
  var formattedPrice = '';
  for (var i = 0; i < price.length; i++) {
    if (this.isNumeric(price[i]) || price[i] == '.' || (includeComma && price[i] == ',')) {
      // If current is a . and previous is a character, it can be something like Rs.
      // so ignore it
      if (i > 0 && price[i] == '.' && this.isAlphabet(price[i - 1])) continue;

      formattedPrice += price[i];
    }
  }
  return formattedPrice;
}

/**
 * This function will format the price
 * @param price - string value
 * @return float
 */
exports.parsePrice = function (price) {
  return parseFloat(this.parsePriceString(price, false));
}

/**
 * Insert child after a given element
 * @param el Element to insert
 * @param referenceNode Element to insert after
 */
exports.insertAfter = function (el, referenceNode) {
	referenceNode.parentNode.insertBefore(el, referenceNode.nextSibling);
}

/**
 * Insert element as the first child of the parentElement of referenceElement
 * @param element Element to insert
 * @param referenceElement Element to grab parent element
 */
exports.insertAsFirstChild = function (element, referenceElement) {
	referenceElement.parentElement.insertBefore(element, referenceElement);
	//bump up element above nodes which are not element nodes (if any)
	while (element.previousSibling) {
		element.parentElement.insertBefore(element, element.previousSibling);
	}
}
