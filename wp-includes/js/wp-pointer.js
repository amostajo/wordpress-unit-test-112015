(function(c){var a=0,b=9999;c.widget("wp.pointer",{options:{pointerClass:"wp-pointer",content:function(f,e,d){return c(this).text()},buttons:function(f,e){var g=(wpPointerL10n)?wpPointerL10n.close:"Close",d=c("<a>"+g+"</a>");return d.bind("click.pointer",function(){e.element.pointer("close")})},position:"top",show:function(e,d){d.pointer.show();d.opened()},hide:function(e,d){d.pointer.hide();d.closed()},document:document},_create:function(){var e,d;this.content=c('<div class="wp-pointer-content"></div>');this.arrow=c('<div class="wp-pointer-arrow"><div class="wp-pointer-arrow-inner"></div></div>');d=this.element.parents().add(this.element);e="absolute";if(d.filter(function(){return"fixed"===c(this).css("position")}).length){e="fixed"}this.pointer=c("<div />").append(this.content).append(this.arrow).attr("id","wp-pointer-"+a++).addClass(this.options.pointerClass).css("position",e).hide().appendTo(this.options.document.body)},_setOption:function(d,f){var g=this.options,e=this.pointer;if(d==="document"&&f!==g.document){e.detach().appendTo(f.body)}else{if(d==="pointerClass"){e.removeClass(g.pointerClass).addClass(f)}}c.Widget.prototype._setOption.apply(this,arguments);if(d==="position"){this.reposition()}else{if(d==="content"&&this.active){this.update()}}},destroy:function(){this.pointer.remove();c.Widget.prototype.destroy.call(this)},widget:function(){return this.pointer},update:function(g){var e=this,h=this.options,d=c.Deferred(),f;if(h.disabled){return}d.done(function(i){e._update(g,i)});if(typeof h.content==="string"){f=h.content}else{f=h.content.call(this.element[0],d.resolve,g,this._handoff())}if(f){d.resolve(f)}return d.promise()},_update:function(f,e){var d,g=this.options;if(!e){return}this.pointer.stop();this.content.html(e);d=g.buttons.call(this.element[0],f,this._handoff());if(d){d.wrap('<div class="wp-pointer-buttons" />').parent().appendTo(this.content)}this.reposition()},reposition:function(){var d;if(this.options.disabled){return}d=this._processPosition(this.options.position);this.pointer.css({top:0,left:0,zIndex:b++}).show().position(c.extend({of:this.element},d));this.repoint()},repoint:function(){var f=this.options,e,d;if(f.disabled){return}e=c.extend(this._processPosition(f.position),{of:this.pointer,offset:""});d=e.at+"";e.at=e.my;e.my=d;if(e.align!="center"){e.offset=(e.align=="top"||e.align=="left")?15:-15;if(e.align=="top"||e.align=="bottom"){e.offset="0 "+e.offset}else{e.offset=e.offset+" 0"}}this.pointer[0].className=this.pointer[0].className.replace(/wp-pointer-[^\s'"]*/,"");this.pointer.addClass("wp-pointer-"+e.edge);this.arrow.position(e)},_processPosition:function(e){var f={top:"bottom",bottom:"top",left:"right",right:"left"},d;if(typeof e=="string"){d={edge:e+""}}else{d=c.extend({},e)}if(!d.edge){return d}if(d.edge=="top"||d.edge=="bottom"){d.align=d.align||"left";d.at=d.at||d.align+" "+f[d.edge];d.my=d.my||d.align+" "+d.edge}else{d.align=d.align||"top";d.at=d.at||f[d.edge]+" "+d.align;d.my=d.my||d.edge+" "+d.align}return d},open:function(e){var d=this,f=this.options;if(this.active||f.disabled){return}this.update().done(function(){d._open(e)})},_open:function(e){var d=this,f=this.options;if(this.active||f.disabled){return}this.active=true;this._trigger("open",e,this._handoff());this._trigger("show",e,this._handoff({opened:function(){d._trigger("opened",e,d._handoff())}}))},close:function(e){if(!this.active||this.options.disabled){return}var d=this;this.active=false;this._trigger("close",e,this._handoff());this._trigger("hide",e,this._handoff({closed:function(){d._trigger("closed",e,d._handoff())}}))},sendToTop:function(d){if(this.active){this.pointer.css("z-index",b++)}},toggle:function(d){if(this.pointer.is(":hidden")){this.open(d)}else{this.close(d)}},_handoff:function(d){return c.extend({pointer:this.pointer,element:this.element},d)}})})(jQuery);