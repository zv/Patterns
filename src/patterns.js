/** Markup Pattern Library.
 *
 * Created by Wichert Akkerman, Humberto Sermeño, Alexander Pilz. To a design of Cornelis G. A. Kolbach.
 */

/*jslint browser: true, undef: true, eqeqeq: true, regexp: true */

var mapal = {
    widthClasses: {},

    // Utility methods
    registerWidthClass: function(cls, minimum, maximum) {
        mapal.widthClasses[cls] = { minimum: minimum,
                                    maximum: maximum };
    },

    _renumberAttribute: function(el, attr, i) {
        var $el = $(el),
            buf = $el.attr(attr);
        if (buf) {
            $el.attr(attr, buf.replace(/[0-9]+/, i));
        }
    },

    renumber: function($container, selector) {
        var $entries = $container.find(selector ? selector : "fieldset,tr,dd"),
            entry, i;

        for (i=0; i<$entries.length; i++) {
            entry = $entries.get(i);
            mapal._renumberAttribute(entry, "id", i);
            $("label, :input", entry).each(function() {
                mapal._renumberAttribute(this, "for", i);
                mapal._renumberAttribute(this, "id", i);
                mapal._renumberAttribute(this, "name", i);
            });
        }
    },


    // Give the first input element with the autofocus class the focus
    initAutofocus: function(root) {
        var $elements = $(":input.autofocus", root),
            i;

        for (i=0; i < $elements.length; i+=1) {
            if (!$elements.eq(i).val()) {
                $elements.get(i).focus();
                break;
            }
        }
        if (i===$elements.length) {
            $elements.eq(0).focus();
        }
    },

    // A simple autocomplete pattern
    initAutocomplete: function(root) {
          $("input.autocomplete", root).each(function() {
              var $input = $(this), 
                  name = $input.attr("name"),
                  $storage;
              $input.attr("name", "_"+name);
              $storage=$("<input type='hidden'/>").attr("name", name).insertBefore($input);
              $input.autocomplete({source: $input.attr("src"),
                                   minLength: 2,
                                   select: function(event, ui) { 
                                        $storage.val(ui.item.value);
                                        $input.val(ui.item.label);
                                        return false;
                                   }
                                   });
          });
    },


    // Check if all dependencies as specified in `command` for
    // an element are satisfied.
    verifyDependencies: function($slave, command) {
        var result=[],
            $form = $slave.closest("form"),
            $input, i, value, parts; 

        if (!$form.length) {
            $form=$(document);
        }
        for (i=0; i<command.on.length; i++) {
            parts=command.on[i];

            $input = $form.find(":input[name="+parts[0]+"]");
            if (!$input.length) {
                result.push(false);
                continue;
            }

            if ($input.attr("type")==="radio" || $input.attr("type")==="checkbox") {
                value = $input.filter(":checked").val();
            } else {
                value = $input.val();
            }

            if ((parts.length===1 || parts[1]==="on") && !value) {
                result.push(false);
                continue;
            } else if (parts[1]==="off" && value) {
                result.push(false);
                continue;
            } else if (parts.length>2) {
                if (parts[1]==="equals" && parts[2]!==value) {
                    result.push(false);
                    continue;
                } else if (parts[1]==="notEquals" && parts[2]===value) {
                    result.push(false);
                    continue;
                }
            } 
            result.push(true);
        }

        if (command.type==="or") {
            for (i=0; i<result.length; i++) {
                if (result[i]) {
                    return true;
                }
            }
            return false;
        } else {
            for (i=0; i<result.length; i++) {
                if (!result[i]) {
                    return false;
                }
            }
            return true;
        }
    },


    // Return the list of all input elements on which the given element has
    // a declared dependency via `dependsOn` classes.
    getDependMasters: function($slave, command) {
        var $result = $(),
            $form = $slave.closest("form"),
            i, parts;

        if (!$form.length) {
            $form=$(document);
        }

        for (i=0; i<command.on.length; i++) {
            parts=command.on[i];
            if (!parts) {
                continue;
            }

            $result=$result.add($form.find(":input[name="+parts[0]+"]"));
        }

        return $result;
    },


    // Setup dependency-tracking behaviour.
    initDepends: function(root) {
        $("*[class*='dependsOn-']", root).each(function() {
            var slave = this,
                $slave = $(this),
                $visible = $(this),
                $panel = $slave.data("mapal.infoPanel"),
                classes = $slave.attr("class").split(" "),
                command = {"on" : [],
                           "action" : "show",
                           "type": "and"
                           };
            var i, a, parts, state;

            for (i=0; i<classes.length; i++) {
                parts=classes[i].split("-");
                if (parts[0].indexOf("depends")===0) {
                    a=parts[0].substr(7).toLowerCase();
                    if (a==="on") {
                        if (parts.length>4) {
                            parts=parts.slice(0,3).concat(parts.slice(3).join("-"));
                        }
                        command.on.push(parts.slice(1));
                    } else {
                        command[a]=parts[1];
                    }
                }
            }

            state=mapal.verifyDependencies($slave, command);
            if ($panel!==undefined) {
                $visible=$visible.add($panel);
            }

            if (command.action==="show") {
                if (state) {
                    $visible.show();
                } else {
                    $visible.hide();
                }
            } else if (command.action==="enable") {
                if (state) {
                    slave.disabled=null;
                    $slave.removeClass("disabled");
                } else {
                    slave.disabled="disabled";
                    $slave.addClass("disabled");
                }
            }

            mapal.getDependMasters($slave, command).bind("change.mapal", function() {
                state=mapal.verifyDependencies($slave, command);
                if (command.action==="show") {
                    if (state) {
                        $visible.slideDown();
                    } else {
                        $visible.slideUp();
                    }
                } else if (command.action==="enable" ) {
                    if (state) {
                        slave.disabled=null;
                        $slave.removeClass("disabled");
                    } else {
                        slave.disabled="disabled";
                        $slave.addClass("disabled");
                    }
                }
            });
        });
    },


    // check if an input element has a value. 
    hasContent: function($el) {
        if ($el.is(":input")) {
            return $el.val();
        } else {
            return $el.text().replace(/\s*/g, "") || $el.find("img,object,video,audio").length;
        }
    },

    // Support for superimposing labels on input elements
    initSuperImpose: function(root) {
        $("label.superImpose", root).each(function() {
            var $label = $(this),
                forInput = $label.attr("for").replace(/([.\[\]])/g, "\\$1"),
                $myInput = forInput ? $(":input#"+forInput+", .rich[id="+forInput+"]") : $(":input", this);

            if (!$myInput.length) {
                return;
            }

            $label
                .css("display", mapal.hasContent($myInput) ? "none" : "block")
                .click(function() {
                    $myInput.focus();
                });

            setTimeout(function() {
                $label.css("display", mapal.hasContent($myInput) ? "none" : "block");
                }, 250);

            $myInput
                .bind("blur.mapal", function() {
                    $label.css("display", mapal.hasContent($myInput) ? "none" : "block");
                })
                .bind("focus.mapal", function() {
                    $label.css("display", "none");
                });
        });
    },


    // Apply some standard markup transformations
    initTransforms: function(root) {
        $(".jsOnly", root).show();

        $("legend", root).each(function() {
            $(this).replaceWith('<p class="legend">'+$(this).html()+'</p>');
        });

        $("label dfn.infoPanel", root).each(function() {
            var $panel = $(this),
                $label = $panel.closest("label"),
                $body = $("body"),
                offset = $panel.offset();
            $panel
                .remove()
                .appendTo($body)
                .css({position: "absolute", left: offset.left, top: offset.top});
            $label.data("mapal.infoPanel", $panel);
        });
    },


    // Manage open/close/hasChild classes for a ul-based menu tree
    initMenu: function(root) {
        $("ul.menu").each(function() {
            var $menu = $(this),
                timer,
                closeMenu, openMenu,
                mouseOverHandler, mouseOutHandler;

            openMenu = function($li) {
                if (timer) {
                    clearTimeout(timer);
                    timer = null;
                }

                if (!$li.hasClass("open")) {
                    $li.siblings("li.open").each(function() { closeMenu($menu);});
                    $li.addClass("open").removeClass("closed");
                }
            };

            closeMenu = function($li) {
                $li.find("li.open").andSelf().removeClass("open").addClass("closed");
            };

            mouseOverHandler = function() {
                var $li = $(this);
                openMenu($li);
            };

            mouseOutHandler = function() {
                var $li = $(this);

                if (timer) {
                    clearTimeout(timer);
                    timer=null;
                }

                timer = setTimeout(function() { closeMenu($li); }, 1000);
            };

            $("ul.menu li", root)
                .addClass("closed")
                .filter(":has(ul)").addClass("hasChildren").end()
                .bind("mouseover.mapal", mouseOverHandler)
                .bind("mouseout.mapal", mouseOutHandler);
        });
    },

    injection: {
    	options: {
    		defaultModifier: "replace",
    		modifiers: {
    			
    		},
    		
    		bodyInjectionId: "__original_body"
    	},
    	load: function($elem, url, targets, sources, callback, instant) {
            instant = instant || false;

            // to have more versatility when calling the function
            if (typeof sources == "string") sources = [ sources ];
            if (typeof targets == "string") targets = [ targets ];

            if ( sources.length > targets.length ) {
            	mapal.injection.completeArray(sources, targets);
            } else {
				// empty source will use content of <body> instead.
				// (exclamation mark is to make sure an id with value "body" will still work as well)
				for (var i = sources.length; i < targets.length; i++) {
        			sources.push(mapal.injection.options.bodyInjectionId);
				}
            }
            
            var target_ids = [];
            var modifiers = [], modifier;
        	var modifier_re = /:[a-zA-Z]+/;
        	
            for (var i = 0; i < targets.length; i++) {
            	if (typeof targets[i] == "string") {
            		// does the specifier contain a parent?
            		if (targets[i].indexOf(">") > 0) {
            			var both = targets[i].split(">");
            			target_ids.push( both[0] + ">#" + both[1].replace( modifier_re, "" ) );
            		} else {
            			target_ids.push( targets[i].replace(modifier_re, "") );
            		}
            	
            		modifier =  (modifier_re.exec(targets[i]) || [":" + mapal.injection.options.defaultModifier]);
            	} else {
            		target_ids.push( $(targets[i]).attr("id") );
            		modifier = ":" + mapal.injection.options.defaultModifier;
            	}
            	
        		if (modifier.length > 0) {
        			modifier = modifier[0];
        			
        			if (modifier.length > 0) modifier = modifier.slice(1);
        		}
        		
        		if (sources[i] == mapal.injection.options.bodyInjectionId) {
        			modifier.push("content");
        		} else {
        			modifiers.push(modifier);
        		}
            }
            
            function htmlLoaded(response, textStatus, responseText) {
            	if ( typeof response == "string" ) {
            		responseText = response;
            		textStatus = 200;
            	} else {
            		responseText = response.responseText;
            	
	                if (response.status < 200 || response.status >= 400) {
	                    return;
	                }
            	}
            	
            	if ($elem.get(0).tagName == 'FORM') {
            		var $panel = $elem.parents('#panel');
            		
            		if ($panel.length > 0) {
            			$panel.overlay().close();
            			$panel.remove();
            		}
            	}
            	
                // get the actual response in case a dataFilter is present in ajaxSettings
                //if ( response.done )
                //	response.done(function(r) { responseText = r; });
                
                // create a dummy div to hold the results
                // and get rid of all the scripts
				//
				// also remove complete head and rename body to a standard div. this is necessary
				// because a second body element is not allowed.
                var $factory = $("<div/>").append(
                	responseText.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
								.replace(/<head\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/head>/gi, "")
								.replace(/<body(.*)>/gi,'<div id="__original_body">')
								.replace(/<\/body(.*)>/gi,'</div>')
                );
                
//                var sourceIds = [];
                var len = targets.length;
                
                for (var idx = 0; idx < len; idx++) {                	
                	var modifier = modifiers[idx];
             		
                	var $target = $( "#" + target_ids[idx] );
                	var appendTo = false;
                	
                	if ( $target.length === 0 ) {
                	    appendTo = document.body;
                		if (target_ids[idx].indexOf(">") > 0) {
                			var both = target_ids[idx].split(">");
                			
                			appendTo = $("#" + both[0]);
                			if ( appendTo.length ===  0) {
                				appendTo = $("<div/>").appendTo(document.body);
                				appendTo.attr("id", both[0]);
                			}
                		}
                		
                		$target = $("<div/>").css("opacity", 0);
                	}
                	
					// empty source IDs will have been replaced with !body. Use the <body> tag as a source
					if (sources[idx] == mapal.injection.options.bodyInjectionId) {
						var $source = $factory.find('#'+mapal.injection.options.bodyInjectionId);
						modifier = "content";
					} else {
                		var $source = $factory.find( '#' + sources[idx] );
					}
                	
                	if ( mapal.injection.modifiers[modifier] && $.isFunction(mapal.injection.modifiers[modifier].execute) ) {
                		$target = mapal.injection.modifiers[modifier].execute( $source, $target, appendTo );
                    	
                		if (appendTo) $target.appendTo(appendTo);
                		
                		mapal.initContent($target);
                		
                		if (typeof callback == 'function') {
                			callback($target);
                		} else {
                			(callback['onFinished']||$.noop)($target);
                		}
                		
                		//$target.animate({"opacity": 1}, "fast");
                	} else {
                		alert('Injection[WARN]: Could not find modifier "' + modifier + '"' );
                	}
                }
                
                // check if this was a navigation call
                var $uls = $elem.parents("ul.navigation");
                if ($uls.length > 0) {
                	$uls.find('li').removeClass('current');
                	var $li = $elem.parents("li");
                	if ($li.length > 0) {
                		$($li[0]).addClass('current');
                	}
                }
            }
            
            // 
            // Set the opacity of allowed targets
            //
            var count = 0;
            var opacityTargets = [];
            for (var idx = 0; idx < target_ids.length; idx++) {
            	if ( mapal.injection.modifiers[modifiers[idx]].setTargetOpacity ) {
            		opacityTargets.push(target_ids[idx]);
            	}
            }
            
            var $targets = $("#" + opacityTargets.join(",#")); 
            
            if ($targets.length > 0 && !instant) {
            	$targets.animate({"opacity": 0}, "slow", function() {
		            			count += 1;
		            			if (count == $targets.length) {
		            				mapal.injection.ajax($elem, url, htmlLoaded);
		            			}
		            		}
				       );
            } else {
            	mapal.injection.ajax($elem, url, htmlLoaded);
            }
        },
        
        ajax: function($elem, url, params, callback) {
        	var type = "GET";
        	        	
        	if ( $elem.get(0).tagName == 'FORM') {
        		type = 'POST';
        		
        		$elem.ajaxSubmit({
        			url: url,
        			type: 'POST',
        			success: params
        		});
        	} else {
            	// if the second parameter was provided
            	if (params) {
            		// if it's a function
            		if ($.isFunction(params)) {
            			// we assume that it's the callback
            			callback = params;
            			params = undefined;
            		} else if (typeof params === "object") {
            			// build a param string
            			params = $.param(params, $.ajaxSettings.traditional);
            			type = "POST";
            		}
            	}

	        	jQuery.ajax({
	        		url: url,
	        		type: type,
	        		dataType: "html",
	        		data: params,
	        		complete: function(jqXHR, textStatus) {
	                	var header = jqXHR.getResponseHeader('X-Griddeo-Action');
	                	var callCallback = true;
	                	if (header) {
	                		var parts = header.split(';');
	                		
	                		if ( parts.length > 0 && $.isFunction(mapal.injection.griddeoActions[parts[0]]) ) {
 	                			callCallback = mapal.injection.griddeoActions[parts[0]]( parts.slice(1) );
	                		}
	                	}
	                	
	                	if (callCallback) callback(jqXHR, textStatus);
	        		},
	        		error: function(xhr, status, errorThrown) {
	        			return;
	        		}
	        	});
        	}
        	
        },
        
        griddeoActions: {
        	'force-redirect': function(params) {
        		window.location = params[0].trim();
        		return false;
        	}
        },
        
        modifiers: {
        	"replace": {
        		"execute": function( $source, $target, appendTo ) {
	        		if (appendTo) {
	        			return $source.css("opacity", 0);
	        		}
	        		
	        		$target.replaceWith( $source.css("opacity", 0) );
	        		
	        		return $("#" + $source.attr("id") );
	        	},
	        	
	        	setTargetOpacity: true
        	},
        	
        	"content": {
        		"execute": function( $source, $target ) {
	        		$target.html($source.html());
	        		
	        		return $target;
        		},
        		
        		setTargetOpacity: true
        	},
        	
        	"after": {
        		"execute": function( $source, $target  ) {
	        		$children = $($source[0].children).css('opacity', 0);
	
	        		$target.append($children);
	        		
	        		return $children;
        		},
        		
        		setTargetOpacity: false
        	},
        	
        	"before": { 
        		"execute": function( $source, $target ) {
	        		$children = $($source[0].children).css('opacity', 0);
	
	        		$target.append($children);
	        		        		
	        		return $children;
        		},
        		
        		setTargetOpacity: false
	        },
        	
        	"prepend": { 
        		"execute": function( $source, $target ) {
	        		$target.before($source);
	        		
	        		return $source;
	        	},
	        	
	        	setTargetOpacity: false
        	},
        	"append": { 
        		"execute": function( $source, $target ) {
	        		$target.after($source);
	        		
	        		return $source;
	        	},
	        	
	        	setTargetOpacity: false
        	}
        },
        
        completeArray: function( larger, smaller ) {
        	var len = larger.length;
        	for (var i = smaller.length; i < len; i ++ ) {
        		smaller.push( larger[i] );
        	}
        }
    },

    patterns: {
    	"options": {
    		search: {
    			click:[
    			       "a[rel^=#]",
    			       "a[rel^='.']",
    			       "a[data-injection^='.']",
    			       "a[data-injection^=#]"
    			     ],
    			submit: [
    			      "form[data-injection^='.']",
    			      "form[data-injection^=#]"
    			      ]  
    		}
    	},
    	
    	'listeners': {
    		'onBeforeStart': [],
    		'onFinished': [],
    		'onExecuted': []
    	},
    	
        // Enable DOM-injection from anchors
        init: function () {
        	// iniitalize the listeners for each of the patterns
            for (var key in mapal.patterns) {
            	if (mapal.patterns[key].execute) {
            		mapal.patterns[key].listeners = $.extend( true, {}, mapal.patterns.listeners ); 
            	}
            }
            
            // Call the initialization function for each of the patterns
            for (var key in mapal.patterns) {
            	(mapal.patterns[key].init||$.noop)();
            	
            	if (mapal.patterns[key].dataAttr) {
            		//mapal.patterns.options.search.click.push('[data-' + key + ']');
            	}
            }

            function handlePattern(e) {
            	// First we get the source IDs, whether optional or not
                var targets, $a = $(this),
                	sources = ($a.attr("href")||$a.attr("action")).split("#"), 
                	attrVal = ($a.attr("rel") || $a.attr("data-injection"));
                
                // make sure we don't interfere with openPanels below
                if ( $a.hasClass('openPanel') || $a.hasClass('closePanel') ) return;
                
                // HREF="http://url.to/follow#source1#source2";
                var url = sources[0];
                sources = sources.slice(1);

                // We treat injection differently than the other patterns
                // namely: injection will always be here!
                if ( attrVal.startsWith("#") ) {
                	// this means injection
                    if ( attrVal.length > 1 )
                    	targets = attrVal.replace(/\s/g,"").split("#").slice(1);
                    else
                    	targets = [];

                    // let injection handle the rest
                    mapal.injection.load($a, url, targets, sources, function($target) {
                        $target.animate({opacity: 1}, "fast");
                    });                
                } else {
                	// this means some other pattern, so let the pattern handle what the attribute means
                	var re = /^[\.][a-zA-Z]+/;
                	var patt = re.exec(attrVal);
                	
                	if ( patt.length == 0 ) {
                		// the pattern was malformed. Inform the designer
                		alert("Pattern[ERROR]: malformed pattern: " + attrVal);
                	} else {
                		patt = patt[0].slice(1);

                		var params = attrVal.replace(re, "");
                		var paramObjs = mapal.patterns.extractParameters(params, sources);
                		if ( mapal.patterns[patt]  ) {
                			// only do something if we found the pattern
                			if (!mapal.patterns[patt].passive) {
                				// ignore the pattern if it is not active
                				if (mapal.patterns.callListener($a, patt, 'onBeforeStart')) {
                					mapal.patterns[patt].execute($a, url, sources, paramObjs, e);
                					mapal.patterns.callListener($a, patt, 'onExecuted');
                				}
                			}
                		} else {
                			alert('Pattern[WARN]: the pattern "' + patt + '" was not found');
                		}
                	}
                }
        		e.preventDefault();
        		return false;
            };
            
            $(mapal.patterns.options.search.click.join(", ")).live("click.mapal", handlePattern );
            $(mapal.patterns.options.search.submit.join(", ")).live("submit.mapal", handlePattern );
        },
        
        extractParameters: function(params, sources) {
        	var tmp;
    		var paramObjs = {};
    		if (params.length > 0) {
				var p = params.slice(1).split('!');
				for (var i = p.length-1; i >= 0; i--) {
                    // support injection parameters in other patterns
                    if (p[i][0] == '#') {
                    	var param, effect;
                    	
                        if (p[i].indexOf('.') > 0) {
                            tmp = p[i].split('.');
                            param = tmp[0];
                            effect = tmp[1];
                        } else {
                            param = p[i];
                            effect = undefined;
                        }
                        var source = [sources.pop()];

                        if (effect == 'instant') {
                            mapal.injection.load($a, url, param.slice(1), source, function($target) {
                                $target.css("opacity", 1);
                            }, true);
                        } else {
                            mapal.injection.load($a, url, param.slice(1), source, function($target) {
                                $target.animate({opacity: 1}, "fast");
                            });
                        }
                    } else if (p[i].indexOf('=') > 0) {
						var tmp = p[i].split('=');
						
						if (/^'[^']*'/.test(tmp[1]) || /^[0-9]+$/.test(tmp[1])) {
							paramObjs[tmp[0]] = eval(tmp[1]);
						} else {
							paramObjs[tmp[0]] = tmp[1];
						}
					} else {
						paramObjs[p[i]] = true;
					}
				}
			}
    		return paramObjs;
        },
        
        callListener: function( elem, pattern, event ) {
        	var weContinue = true;
        	$(mapal.patterns[pattern].listeners[event]).each(function(){
        		if (weContinue && !this(elem) ) {
        			weContinue = false;
        			return;
        		};
        	});
        	
        	return weContinue;
        },
        
        registerListener: function(patterns, event, listener) {
        	if (typeof patterns == 'string') {
        		if (mapal.patterns[patterns].listeners[event]) {
        			mapal.patterns[patterns].listeners[event].push(listener);
        		}
        	} else {
	        	$(patterns).each( function() {
	        		if (mapal.patterns[this]) {
	        			if (mapal.patterns[this].listeners[event]) {
	        				mapal.patterns[this].listeners[event].push(listener);
	        			}
	        		}
	        	});
        	}
        }
    },

    closeTooltips: function() {
        $("dfn.infoPanel.open").removeClass("open");
        $("body").unbind("click.tooltip");
    },

    initTooltip: function(root) {
    	$(root).find(".tooltipTrigger").each( function() {
    		$(this).tooltip({relative: true}).dynamic();
    	});
    	
        $("dfn.infoPanel:not(span)").each(function() {
            var $panel = $(this),
                title = $panel.attr("title");

            if ($panel.data("mapal.tooltip")) {
                return;
            }

            if (title) {
                $("<span/>")
                    .addClass("title")
                    .text(title)
                    .prependTo($panel);
                $panel.removeAttr("title");
            }

            $panel
                .click(function(event) {
                    if ($panel.hasClass("open")) {
                        $panel.removeClass("open");
                        $("body").unbind("click.tooltip");
                    } else {
                        mapal.closeTooltips();
                        $panel.addClass("open");
                        $("body").one("click.tooltip", mapal.closeTooltips);
                    }
                    event.stopPropagation();
                })
                .data("mapal.tooltip", true);
        });
    },

    // Utility method to update the width classes on the body
    updateWidthClasses: function() {
        var width = $(window).width(),
            $body = $("body"),
            limits;

        for (var cls in mapal.widthClasses) {
            if (mapal.widthClasses.hasOwnProperty(cls)) {
                limits=mapal.widthClasses[cls];
                if ((limits.minimum===null || limits.minimum<=width) && (limits.maximum===null || width<=limits.maximum)) {
                    $body.addClass(cls);
                } else {
                    $body.removeClass(cls);
                }
            }
        }
    },


    initWidthClasses: function() {
        mapal.updateWidthClasses();
        $(window).bind("resize.mapal", mapal.updateWidthClasses);
    },


    // No browser supports all DOM methods to get from an object to its
    // parent window and document and back again, so we convert all 
    // html objects to iframes.
    initIframes: function(root) {
        $("object[type=text/html]", root).each(function() {
            var $object = $(this),
                $iframe = $("<iframe allowtransparency='true'/>");

            $iframe
                .attr("id", $object.attr("id"))
                .attr("class", $object.attr("class"))
                .attr("src", $object.attr("data"))
                .attr("frameborder", "0")
                .attr("style", "background-color:transparent");
            $object.replaceWith($iframe);
        });
    },

    // Older IE versions need extra help to handle buttons.
    initIEButtons: function() {
        if ($.browser.msie ) {
            var version = Number( $.browser.version.split(".", 2).join(""));
            if (version>80) {
                return;
            }
        }

        $("form button[type=submit]").live("click", function() {
            var name = this.name,
                $el = $("<input/>"),
                value = this.attributes.getNamedItem("value").nodeValue;

            $el.attr("type", "hidden")
               .attr("name", name)
               .val(value)
               .appendTo(this.form);
            $("button[type=submit]", this.form).attr("name", "_buttonfix");
        });

    },
    
    initSorts: function( root ) {
    	$sorting = $(root).find('ul.sorting');
    	
    	if ($sorting.length > 0) {
	    	$sorting.sortable({
	    		'axis': 'y',
	    		'items': 'li',
	    		'update': function(event, ui){
	    			var $this = $(this); 
	    			var order = $this.sortable("serialize");
	    			
	    			$.post($this.attr("data-injection"), order);
	    		}
	    	});
    	}
    },
    
    initButtonSets: function(root) {
    	if ( $(root).buttonset ) {
    		$(root).find('.buttonSet').removeClass('buttonSet').buttonset();
    	}
    },
    
    initAutoLoads: function( root ) {
    	$(root).find('.autoLoading-visible').parents(":scrollable").each(function() {    		
			var $data = $(this).data("autoLoading");
			
			if (!$data) {
				$(this).data("autoLoading", true);
				$(this).bind("scroll", function() {
					var $window = $(this);
					var elems = $window.find( '.autoLoading-visible' );
		    		var ret = false;
		    		
		    		$(elems).each(function() {
		    			var $this = $(this);
		    			var offset = $this.position();
		    			var doTrigger = $window.height() >= offset.top;
		    			
		    			if (doTrigger && !$this.data("autoLoading")) {
		    				$this.data("autoLoading", true);
		    				$this.trigger('click');
		    				ret = true;
		    			}
		    		});
		    		
		    		return ret;
	    		});
			}
    	});
    },
    
    passivePatterns: {
    	'selectSiblingRadio': {
    		init: function() {},
    		initContent: function(root) {
    			$(root).find('.selectSiblingRadio').focus(function() {
    				var $this = $(this);
    				
    				$this.parent().find('input[type=radio]').attr('checked', true);
    			});
    		}
    	}
    },
    
    // Setup a DOM tree.
    initContent: function(root) {
        mapal.initTransforms(root);
        mapal.initAutofocus(root);
        mapal.initAutocomplete(root);
        mapal.initDepends(root);
        mapal.initSuperImpose(root);
        mapal.initTooltip(root);
        mapal.initMenu(root);
        mapal.initSorts(root);
        mapal.initButtonSets(root);
        mapal.initAutoLoads(root);
        //
        
        for (passivePatternName in mapal.passivePatterns) {
        	var passivePattern = mapal.passivePatterns[passivePatternName];
        	if ( passivePattern.initContent && $.isFunction(passivePattern['initContent']) ) {
        		passivePattern.initContent(root);
        	}
        }
        
        
        
        // Replace objects with iframes for IE 8 and older.
        if ($.browser.msie ) {
            var version = Number( $.browser.version.split(".", 2).join(""));
            if (version<=80) {
                mapal.initIframes(root);
            }
        }

        $(root).trigger("newContent", root);
    },


    // Setup global behaviour
    init: function() {
        mapal.initWidthClasses();
        mapal.patterns.init();
        //mapal.initIEButtons();
    },
    
    ui: {},
    
    'store': {
    	'getPatternAttributes': function(pattern) {
    		if (!mapal.store.hasStorage()) return [];
    		
    		var count = parseInt(window.sessionStorage.getItem( pattern + '-count' ) || "0");
    		var attrs = [];
    		
    		for (var i = 1; i <= count; i++ ) {
    			attrs.push(window.sessionStorage.getItem( pattern + '-' + i ));
    		}
    		
    		return attrs;
    	},
    	
    	'addPatternAttribute': function(pattern, value) {
    		if (!mapal.store.hasStorage()) return;
    		
    		var count = parseInt(window.sessionStorage.getItem( pattern + '-count' ) || "0") + 1;
    		
    		window.sessionStorage.setItem( pattern + '-count', count );
    		window.sessionStorage.setItem( pattern + '-' + count, value );
    	},
    	
    	'setPatternAttribute': function(pattern, index, value) {
    		if (!mapal.store.hasStorage()) return;
    		
    		var count = parseInt(window.sessionStorage.getItem( pattern + '-count' ) || "0");
    		
    		if (index > 0 && index <= count) {
    			window.sessionStorage.setItem( pattern + '-' + index, value);
    			
    			return true;
    		}
    		
    		return false;
    	},
    	
    	'initPatternStore': function(pattern) {
    		if (!mapal.store.hasStorage()) return;
    		
    		if (window.sessionStorage.getItem( pattern+'-count' ) === null) {
    			window.sessionStorage.setItem( pattern+'-count', '0' );
    		}
    	},
    	
    	'hasStorage': function() {
    		return typeof window.sessionStorage !== 'undefined';
    	}
    }
};


$.extend( mapal.patterns, {
	"fancybox": {
		execute: function(elem, url, sources, params, event) {
			//var $this = $(event.target);
			
			//var modifier = /![a-zA-Z]+/.exec(params);
			//var className = /[\.][a-zA-Z\-0-9_]+/.exec(params);
			var options = {};
			
			//if (modifier && modifier.length > 0) {
				//options.type = modifier[0].slice(1);
			//} else {
			if (params['type'])
				options.type = params['type'];
			//}
			
			options.href = url + (sources.length > 0 ? '#' + sources[0] : '');
									
			$.fancybox( options );
			$.fancybox.resize();
		}
	}
});


$.extend( mapal.patterns, {
    "setclass": {
		init: function() {
			mapal.store.initPatternStore('setclass');

			$(mapal.store.getPatternAttributes('setclass')).each(function(index) {
				var values = this.split('!'); // 0: id, 1: attribute, 2: value, 3: other
				var obj = {
						'index': index+1,
						"id": values[0],
						"attr": values[1],
						'value': values[2],
						'other': values[3]
					};
				
				mapal.patterns.setclass.store[obj.id + "." + obj.attr] = obj; 
			});

			$('[data-setclass]').live('click', mapal.patterns.setclass.handleClick).each(function() {
				var $this = $(this);
				var obj = mapal.patterns.setclass.getObjFromParams(
							  $this,
						  	  mapal.patterns.extractParameters('!' + $this.attr('data-setclass'))
						  );
				
				if (obj === null) return;

				if ( !obj.store ) {
					 if (mapal.patterns.setclass.store[obj.id + "." + obj.attr] ) {
						delete mapal.patterns.setclass.store[obj.id + "." + obj.attr];
					 }
				} else {
					 if (mapal.patterns.setclass.store[obj.id + "." + obj.attr] ) return;
				}
				if ( obj.attr === 'class' ) {
				//	$( "#" + obj.id ).addClass( obj.value );  // removed the removeClass which was used in toggle
				} else {
					$( "#" + obj.id ).attr( obj.attr, obj.value );
				}
				
				if (obj.store) {
					mapal.patterns.setclass.storeValue(obj.id, obj.attr, obj.value, obj.other);
				}
			});
			
			for (key in mapal.patterns.setclass.store ) {
				var obj = mapal.patterns.setclass.store[key];
				if ( obj.attr === 'class' ) {
					$( "#" + obj.id ).removeClass( obj.other ).addClass( obj.value );
				} else {
					$( "#" + obj.id ).attr( obj.attr, obj.value );
				}
			}
		},
		
		getObjFromParams: function($elem, params) {
			var values = params['values'];
			var obj = {};
			
			obj.id = params['id'] || $elem.attr("id");			
			obj.attr = params['attr'] || 'class';
			obj.store = params['store'] || false;
			
			if (typeof obj.id !== "string" || obj.id.length == 0 ||
				typeof obj.attr !== 'string' || obj.attr.length == 0 || 
				typeof values  !== 'string' || values.length == 0 ) {
				return null;
			}

			values = values.split(':');
			if ( values.length == 1) {
				values.push('');
			}

			obj.value = values[0];
			obj.other = values[1];
			
			return obj;
		},
		
		handleClick: function(event) {
			var $this = $(this);
			var params = mapal.patterns.extractParameters('!' + $this.attr('data-setclass'));
			
			mapal.patterns.setclass.execute($this, '', '', params, event);
			
			event.preventDefault();			
		},
		
		store: {},
		
		dataAttr: true,
		
		execute: function( elem, url, sources, params, event ) {
			var value, other;
			var obj = mapal.patterns.setclass.getObjFromParams( elem, params );
			if (obj === null) return false;
			
			var $setclass = $("#" + obj.id);			
			if ($setclass.length == 0) return false;
			
			if (obj.attr === 'class') {
			    if (obj.other.length > 0 ) {
			        var cls = $setclass.attr('class').split(' ');
			        regval = new RegExp(obj.value);
			        for (i=0;i<cls.length;i++){
			            if (cls[i].match(regval)) {
            			    $setclass.removeClass(cls[i]);
			            }
			        }	
		            $setclass.addClass(obj.other);
		        } else if ($setclass.hasClass(obj.value) || $setclass.hasClass(obj.other)) {
		            /* obj.value already set and no other present. pass */
				} else {
				    $setclass.addClass(obj.value);
				}
			} else {
			    /* cave, haven't touched that yet, is still behaving like toggle */
			/*	var current = $setclass.attr(obj.attr);
				if (current === obj.value) {
					$setclass.attr(obj.attr, obj.other);
					value = obj.other;
					other = obj.value;
				} else if (current === obj.other) {
					$setclass.attr(obj.attr, obj.value);
					value = obj.value;
					other = obj.other;
				} else {
					$setclass.attr(obj.attr, obj.other);
					value = obj.other;
					other = obj.value;
				}*/
			}
			
			if (obj.store) mapal.patterns.setclass.storeValue(obj.id, obj.attr, value, other);
			
			return true;
		},
		
		storeValue: function(id, attr, value, other) {
			var store = mapal.patterns.setclass.store[id + '.' + attr];
			if ( store ) {
				mapal.store.setPatternAttribute('setclass', store.index, id + "!" + attr + "!" + value + "!" + other);
			} else {
				mapal.store.addPatternAttribute('setclass', id + "!" + attr + "!" + value + "!" + other);
			}
		}
	},
	"toggle": {
		init: function() {
			mapal.store.initPatternStore('toggle');

			$(mapal.store.getPatternAttributes('toggle')).each(function(index) {
				var values = this.split('!'); // 0: id, 1: attribute, 2: value, 3: other
				var obj = {
						'index': index+1,
						"id": values[0],
						"attr": values[1],
						'value': values[2],
						'other': values[3]
					};
				
				mapal.patterns.toggle.store[obj.id + "." + obj.attr] = obj; 
			});

			$('[data-toggle]').live('click', mapal.patterns.toggle.handleClick).each(function() {
				var $this = $(this);
				var obj = mapal.patterns.toggle.getObjFromParams(
							  $this,
						  	  mapal.patterns.extractParameters('!' + $this.attr('data-toggle'))
						  );
				
				if (obj === null) return;

				if ( !obj.store ) {
					 if (mapal.patterns.toggle.store[obj.id + "." + obj.attr] ) {
						delete mapal.patterns.toggle.store[obj.id + "." + obj.attr];
					 }
				} else {
					 if (mapal.patterns.toggle.store[obj.id + "." + obj.attr] ) return;
				}
				
				if ( obj.attr === 'class' ) {
					$( "#" + obj.id ).removeClass( obj.other ).addClass( obj.value );
				} else {
					$( "#" + obj.id ).attr( obj.attr, obj.value );
				}
				
				if (obj.store) {
					mapal.patterns.toggle.storeValue(obj.id, obj.attr, obj.value, obj.other);
				}
			});
			
			for (key in mapal.patterns.toggle.store ) {
				var obj = mapal.patterns.toggle.store[key];
				if ( obj.attr === 'class' ) {
					$( "#" + obj.id ).removeClass( obj.other ).addClass( obj.value );
				} else {
					$( "#" + obj.id ).attr( obj.attr, obj.value );
				}
			}
		},
		
		getObjFromParams: function($elem, params) {
			var values = params['values'];
			var obj = {};
			
			obj.id = params['id'] || $elem.attr("id");			
			obj.attr = params['attr'] || 'class';
			obj.store = params['store'] || false;
			
			if (typeof obj.id !== "string" || obj.id.length == 0 ||
				typeof obj.attr !== 'string' || obj.attr.length == 0 || 
				typeof values  !== 'string' || values.length == 0 ) {
				return null;
			}

			values = values.split(':');
			if ( values.length == 1) {
				values.push('');
			}

			obj.value = values[0];
			obj.other = values[1];
			
			return obj;
		},
		
		handleClick: function(event) {
			var $this = $(this);
			var params = mapal.patterns.extractParameters('!' + $this.attr('data-toggle'));
			
			mapal.patterns.toggle.execute($this, '', '', params, event);
			
			event.preventDefault();			
		},
		
		store: {},
		
		dataAttr: true,
		
		execute: function( elem, url, sources, params, event ) {
			var value, other;
			var obj = mapal.patterns.toggle.getObjFromParams( elem, params );
			if (obj === null) return false;
			
			var $toggle = $("#" + obj.id);			
			if ($toggle.length == 0) return false;
			
			if (obj.attr === 'class') {
				if ($toggle.hasClass(obj.value)) {
					$toggle.removeClass(obj.value).addClass(obj.other);
					value = obj.other;
					other = obj.value;
				} else if ( obj.other.length > 0 && $toggle.hasClass(obj.other)) {
					$toggle.removeClass(obj.other).addClass(obj.value);
					value = obj.value;
					other = obj.other;
				} else {
					$toggle.addClass(obj.value);
					value = obj.value;
					other = obj.other;
				}
			} else {
				var current = $toggle.attr(obj.attr);
				
				if (current === obj.value) {
					$toggle.attr(obj.attr, obj.other);
					value = obj.other;
					other = obj.value;
				} else if (current === obj.other) {
					$toggle.attr(obj.attr, obj.value);
					value = obj.value;
					other = obj.other;
				} else {
					$toggle.attr(obj.attr, obj.other);
					value = obj.other;
					other = obj.value;
				}
			}
			
			if (obj.store) mapal.patterns.toggle.storeValue(obj.id, obj.attr, value, other);
			
			return true;
		},
		
		storeValue: function(id, attr, value, other) {
			var store = mapal.patterns.toggle.store[id + '.' + attr];
			if ( store ) {
				mapal.store.setPatternAttribute('toggle', store.index, id + "!" + attr + "!" + value + "!" + other);
			} else {
				mapal.store.addPatternAttribute('toggle', id + "!" + attr + "!" + value + "!" + other);
			}
		}
	}
});

$.extend( mapal.ui, {
	"modal": function( url, options ) {
		var opts = '.modal';
		if (options) {
			for (opt in options) {
				opts += '!' + opt + "=";
				if (typeof options[opt] == 'string') {
					opts += "'" + options[opt] + "'";
				} else {
					opts += options[opt];
				}
			}
		}
		var $a = $('<a>').attr('href', url).attr('rel', opts);
		$a.click();
	}
});

/**
 * options: 
 * - class: the class that would be assigned to the 
 */
$.extend( mapal.patterns, {
	"modal": {
		options: {
			"class": "",
			"loadingText": "Loading...",
			'showLoading': true,
			pauseVideo: false
		},
		
		init: function() {
			$("#panel .closePanel").live('click.mapalModal', function(e) {
				mapal.patterns.modal._findClose($(this));
				e.preventDefault();
				return false;
			});
		//	mapal.patterns.registerListener(['selfHealing'], 'onExecuted', mapal.patterns.modal._findClose);
		},
		
		_findClose: function($elem) {
			if ( $elem.hasClass('closePanel') ) {
				var $panel = $elem.parents( "#panel" );
				if ( $panel.length > 0 ) {
					mapal.patterns.modal.close($panel);
				}
			}
		},
		
		execute: function( elem, url, sources, params, event ) {
            var $trigger = $(event.target),
	            href = event.target.tagName.toLowerCase()==="a" ? $trigger.attr("href") : $trigger.attr("name"),
	            parts = href.split("#", 2),
	            $panel = $("#panel");
	        var source = (parts[1] == undefined) ? [] : parts[1];

	        var opts = $.extend({}, mapal.patterns.modal.options, params);
	        
	        if ($panel.length===0) {
	            $panel = $("<div/>")
	                .attr("id", "panel")
	                .appendTo(document.body);
	            $("<div/>").attr("id","panel-content").appendTo($panel);
	        }
	        
	        $panel.data('modal', opts);
	        
	        mapal.patterns.modal.pauseVideo(opts, true);
	        
	        if (opts['showLoading']) {
	        	var $loading = $("<div>").text(opts['loadingText']).attr("id", "panel-loading");
	        	$('<span>').appendTo($loading);
	        	$loading.appendTo($panel);
	        	
	        	$panel.addClass('loading');
	        	
	        	mapal.patterns.modal.apiInit($panel, opts);
	        	mapal.patterns.modal.centerOverlay($panel);
	        }
	        
	        mapal.injection.load(elem, parts[0], "panel-content:content", source, {
	        		'onFinished': function($target) {
	        			$panel.attr('class', opts['class']);
	        			
	        			$target.css("opacity", 1).addClass("panel");
	        			
	        			
			            if (opts['showLoading']) {
			            	$("#panel-loading").remove();
			            } else {
			            	mapal.injection.apiInit($panel, opts);
			            }
			            
			            mapal.patterns.modal.centerOverlay($panel);
	        		}
	        });
		},
		
		apiInit: function($panel, opts) {
			var api;
			
            //$target.find("form").ajaxForm({context: $trigger.get(0),
            //                           success: mapal.patterns.modal.formHandler});
            api = $panel.overlay({api: true,
                                  closeOnClick: false,
                                  onClose: function() {
                                	  mapal.patterns.modal.pauseVideo(opts, false);
                                  },
                                  top: 'center',
                                  mask: {color: "#ebecff", loadSpeed: 200, opacity: 0.9}});
            api.load();
		},
		
		'centerOverlay': function( $panel ) {					
			var win = $(window);
			var w = $panel.outerWidth({ "margin": true });//get width of overlay
	        var h = $panel.outerHeight({ "margin": true }); //get height of overlay
	        var l = Math.max((win.width() - w) / 2, 0);  //calculate left property
	        var t = Math.max((win.height() - h) / 2, 0);  //calculate top property
	         
	        $panel.css({ 'position': 'fixed', 'top': t, 'left': l });
		},
		
		"close": function($panel) {
			//var opts = $panel.data('modal');
			//mapal.patterns.modal.pauseVideo(opts, false);
			$panel.overlay().close();
			$panel.remove();
		},
		
		pauseVideo: function( opts, which ) {
			if (typeof Playbox !== 'undefined' && opts && opts.pauseVideo ) {
				if ( which ) {
					Playbox.pause();
				} else {
					Playbox.resume();
				}
			}
		},
		
	    formHandler: function(data, status, xhr, $form) {
	        // regexp taken from jQuery 1.4.1
	        var rscript = /<script(.|\s)*?\/script>/gi,
	            $trigger = $(this.context),
	            href = this.context.tagName.toLowerCase()==="a" ? $trigger.attr("href") : $trigger.attr("name"),
	            action = $form.attr("action"),
	            $panel = $("#panel"),
	            ct = xhr.getResponseHeader("content-type"),
	            isJSON = ct.indexOf("application/json") >= 0,
	            $tree, target;

	        // Error or validation error
	        if (isJSON || xhr.status !== 202) {
	            if (isJSON) {
	                var reply = $.parseJSON(xhr.responseText);
	                $trigger.trigger("ajaxFormResult", reply);
	                if (reply.action==="reload") {
	                    location.reload();
	                } else if (reply.action==="close" || !reply.action) {
	                	mapal.patterns.modal.close($panel);
	                }
	                return;
	            } else {
	                $trigger.trigger("ajaxFormResult");
	            }
	            mapal.patterns.modal.close($panel);
	            return;
	        }

	        if (action.indexOf("#")>0) {
	            target = action.split("#", 2)[1];
	        } else {
	            target = href.split("#", 2)[1];
	        }

	        $tree = $("<div/>").append(data.replace(rscript, ""));
	        $tree = $tree.find("#"+target).attr("id", "panel-content");
	        mapal.initContent(target);
	        $("#panel-content").replaceWith($tree);
	        $panel.find("form").ajaxForm({context: this.context,
	                                      success: mapal.patterns.modal.formHandler});
	    }
	}
});

$.extend( mapal.patterns, {
	"selfHealing": {
		options: {
			confirm: null,
			"show": null,
			"remove": null,
			"disable": null,
			removeOnClick: true,
			displayTime: 8
		},
		
		execute: function( elem, url, sources, params, event ) {
			var container = $("#selfhealing-messages"), paramObjs = {}, p = {};
			
			var options = $.extend({}, mapal.patterns.selfHealing.options);
			
			// split up the params
			$.extend(options, params);
			
			if (typeof options["disable"] !== 'string' ) {
				options['disable'] = elem;
			}
			
			if (container.length == 0) {
				container = $("<div />").attr("id", "selfhealing-messages").appendTo(document.body);
			}
			
			var count = ++mapal.patterns.selfHealing.count;
			
		//	$("<div />").attr("id", "selfhealing-message-" + count).attr("opacity", 0).appendTo(container);
			
			if ( typeof options['confirm'] == 'string' ) {
				if (!confirm(options['confirm'])) return;
			}
			
			if (options['disable'] !== null) {
				$(options['disable']).attr('disabled', 'disabled');
			}
			
			// create the message element
	        mapal.injection.load(elem, url, "selfhealing-messages>selfhealing-message-" + count, sources, function($target) {
	        	var doMouseLeave = function() {
	        		var $this = $(this);
	        		$this.data("persistent", false);
	        		mapal.patterns.selfHealing.remove($this);
	        	};
	        	
	        	$target.attr("id", "selfhealing-message-" + count).bind(
	        		{
	        			"mouseenter.mapal-selfHealing": function(event) {
	        				$(this).data("persistent", true);
	        			},
	        			"mouseleave.mapal-selfHealing.": doMouseLeave,
	        			"click": function(event) {
	        				$(this).unbind('.mapal-selfHealing');
	        				doMouseLeave.apply(this, []);
	        			}
	        		}	
	        	);
	        	
	        	$target.appendTo(container);
	        	
	        	if (options['remove'] !== null ) {
	        		// we have an ID to delete
	        		if (typeof options['remove'] == 'string') {
	        			$('#' + options['remove']).slideUp('slow');
	        		} else {
	        			$(options['remove']).slideUp('slow');
	        		}
	        	}
	        	
	        	if (options['show'] !== null ) {
	        		// we have an ID to delete
	        		if (typeof options['show'] == 'string') {
	        			$('#' + options['show']).slideDown('slow');
	        		} else {
	        			$(options['show']).slideDown('slow');
	        		}
	        	}
	        	
	        	$target.animate({"opacity": 1}, "fast", function() {
          			$target.data("timer", setTimeout(function() {
          				mapal.patterns.selfHealing.remove($target);
          			}, mapal.patterns.selfHealing.options.displayTime*1000));
          		});
	        	
	        	mapal.patterns.callListener($(elem), 'selfHealing', 'onFinished');
	        });
		},
		
		remove: function($element) {
			if ( $element.data("persistent") || $element.data("inFx") ) return;
			$element.animate({"opacity": 0}, {
				step: function() {
					if ( $element.data("persistent") ) { 
						// remove the timer
						clearTimeout($element.data("timer"));
						
						// cancel hiding
						$element.stop(true);
						$element.css({"opacity": 1});
						
						return false;
					}
				},
				
				complete: function() {
					var $this = $(this); 
					$this.slideUp('slow', function() {
						$this.data("inFx", false);
						$this.remove();
					}).data("inFx", true);
				}
			});
		},
		
		count: 0
	}
});

$.extend( mapal.patterns, {
	"floatingPanelContextual": {
		options: {
			events: {
				def: ",mouseleave"
			},
			delay: 500
		},

		execute: function( $elem, url, sources, params, event ) {
			var api = $elem.data("tooltip");
			if (!api) {
				// we haven't initialized the tooltip for this element
				// dot it now
				var opts = $.extend({}, mapal.patterns.floatingPanelContextual.options, params);
				
				if ( sources.length > 0 ) {
					opts['tip'] = "#" + sources[0];
				}
				opts['onHide'] = mapal.patterns.floatingPanelContextual.handleOnHide;
				$elem.tooltip(opts).dynamic();
				
				api = $elem.data("tooltip");
			}
			
			if (!api.isShown(false)) {
				api.show();
			}
			var $parents = $elem.parents("li");
			
			if ($parents.length > 0) {
				$($parents[0]).addClass('tipped');
			}
		},
		
		handleOnHide: function() {
			var $elem = this.getTrigger();
			
			var $parents = $elem.parents("li");
			
			if ($parents.length > 0) {
				$($parents[0]).removeClass('tipped');
			}
		}
	}
});

$(document).ready(function() {
    mapal.registerWidthClass("narrow", 0, 780);
    mapal.registerWidthClass("medium", 0, 1109);
    mapal.registerWidthClass("wide", 1110, null);
    mapal.init();
    mapal.initContent(document.body);
    $(document).trigger("setupFinished", document);
});
