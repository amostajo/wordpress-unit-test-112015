var autosave,autosaveLast="",autosavePeriodical,autosaveOldMessage="",autosaveDelayPreview=false,notSaved=true,blockSave=false,fullscreen,autosaveLockRelease=true;jQuery(document).ready(function(a){autosaveLast=a("#post #title").val()+a("#post #content").val();autosavePeriodical=a.schedule({time:autosaveL10n.autosaveInterval*1000,func:function(){autosave()},repeat:true,protect:true});a("#post").submit(function(){a.cancel(autosavePeriodical);autosaveLockRelease=false});a('input[type="submit"], a.submitdelete',"#submitpost").click(function(){blockSave=true;window.onbeforeunload=null;a(":button, :submit","#submitpost").each(function(){var b=a(this);if(b.hasClass("button-primary")){b.addClass("button-primary-disabled")}else{b.addClass("button-disabled")}});if(a(this).attr("id")=="publish"){a("#ajax-loading").css("visibility","visible")}else{a("#draft-ajax-loading").css("visibility","visible")}});window.onbeforeunload=function(){var b=typeof(tinymce)!="undefined"?tinymce.activeEditor:false,d,c;if(b&&!b.isHidden()){if(b.isDirty()){return autosaveL10n.saveAlert}}else{if(fullscreen&&fullscreen.settings.visible){d=a("#wp-fullscreen-title").val();c=a("#wp_mce_fullscreen").val()}else{d=a("#post #title").val();c=a("#post #content").val()}if((d||c)&&d+c!=autosaveLast){return autosaveL10n.saveAlert}}};a(window).unload(function(b){if(!autosaveLockRelease){return}if(b.target&&b.target.nodeName!="#document"){return}a.ajax({type:"POST",url:ajaxurl,async:false,data:{action:"wp-remove-post-lock",_wpnonce:a("#_wpnonce").val(),post_ID:a("#post_ID").val(),active_post_lock:a("#active_post_lock").val()}})});a("#post-preview").click(function(){if(a("#auto_draft").val()=="1"&&notSaved){autosaveDelayPreview=true;autosave();return false}doPreview();return false});doPreview=function(){a("input#wp-preview").val("dopreview");a("form#post").attr("target","wp-preview").submit().attr("target","");if(a.browser.safari){a("form#post").attr("action",function(b,c){return c+"?t="+new Date().getTime()})}a("input#wp-preview").val("")};a("#title").on("keydown.editor-focus",function(c){var b;if(c.which!=9){return}if(!c.ctrlKey&&!c.altKey&&!c.shiftKey){if(typeof(tinymce)!="undefined"){b=tinymce.get("content")}if(b&&!b.isHidden()){a(this).one("keyup",function(d){a("#content_tbl td.mceToolbar > a").focus()})}else{a("#content").focus()}c.preventDefault()}});if("1"==a("#auto_draft").val()){a("#title").blur(function(){if(!this.value||a("#auto_draft").val()!="1"){return}delayed_autosave()})}});function autosave_parse_response(c){var d=wpAjax.parseAjaxResponse(c,"autosave"),e="",a,b;if(d&&d.responses&&d.responses.length){e=d.responses[0].data;if(d.responses[0].supplemental){b=d.responses[0].supplemental;if("disable"==b.disable_autosave){autosave=function(){};autosaveLockRelease=false;d={errors:true}}if(b["active-post-lock"]){jQuery("#active_post_lock").val(b["active-post-lock"])}if(b.alert){jQuery("#autosave-alert").remove();jQuery("#titlediv").after('<div id="autosave-alert" class="error below-h2"><p>'+b.alert+"</p></div>")}jQuery.each(b,function(f,g){if(f.match(/^replace-/)){jQuery("#"+f.replace("replace-","")).val(g)}})}if(!d.errors){a=parseInt(d.responses[0].id,10);if(!isNaN(a)&&a>0){autosave_update_slug(a)}}}if(e){jQuery(".autosave-message").html(e)}else{if(autosaveOldMessage&&d){jQuery(".autosave-message").html(autosaveOldMessage)}}return d}function autosave_saved(a){blockSave=false;autosave_parse_response(a);autosave_enable_buttons()}function autosave_saved_new(b){blockSave=false;var c=autosave_parse_response(b),a;if(c&&c.responses.length&&!c.errors){a=parseInt(c.responses[0].id,10);if(!isNaN(a)&&a>0){notSaved=false;jQuery("#auto_draft").val("0")}autosave_enable_buttons();if(autosaveDelayPreview){autosaveDelayPreview=false;doPreview()}}else{autosave_enable_buttons()}}function autosave_update_slug(a){if("undefined"!=makeSlugeditClickable&&jQuery.isFunction(makeSlugeditClickable)&&!jQuery("#edit-slug-box > *").size()){jQuery.post(ajaxurl,{action:"sample-permalink",post_id:a,new_title:fullscreen&&fullscreen.settings.visible?jQuery("#wp-fullscreen-title").val():jQuery("#title").val(),samplepermalinknonce:jQuery("#samplepermalinknonce").val()},function(b){if(b!=="-1"){jQuery("#edit-slug-box").html(b);makeSlugeditClickable()}})}}function autosave_loading(){jQuery(".autosave-message").html(autosaveL10n.savingText)}function autosave_enable_buttons(){setTimeout(function(){jQuery(":button, :submit","#submitpost").removeAttr("disabled");jQuery(".ajax-loading").css("visibility","hidden")},500)}function autosave_disable_buttons(){jQuery(":button, :submit","#submitpost").prop("disabled",true);setTimeout(autosave_enable_buttons,5000)}function delayed_autosave(){setTimeout(function(){if(blockSave){return}autosave()},200)}autosave=function(){blockSave=true;var c=(typeof tinymce!="undefined")&&tinymce.activeEditor&&!tinymce.activeEditor.isHidden(),d,f,b,e,a;autosave_disable_buttons();d={action:"autosave",post_ID:jQuery("#post_ID").val()||0,autosavenonce:jQuery("#autosavenonce").val(),post_type:jQuery("#post_type").val()||"",autosave:1};jQuery(".tags-input").each(function(){d[this.name]=this.value});f=true;if(jQuery("#TB_window").css("display")=="block"){f=false}if(c&&f){b=tinymce.activeEditor;if(b.plugins.spellchecker&&b.plugins.spellchecker.active){f=false}else{if("mce_fullscreen"==b.id||"wp_mce_fullscreen"==b.id){tinymce.get("content").setContent(b.getContent({format:"raw"}),{format:"raw"})}tinymce.triggerSave()}}if(fullscreen&&fullscreen.settings.visible){d.post_title=jQuery("#wp-fullscreen-title").val()||"";d.content=jQuery("#wp_mce_fullscreen").val()||""}else{d.post_title=jQuery("#title").val()||"";d.content=jQuery("#content").val()||""}if(jQuery("#post_name").val()){d.post_name=jQuery("#post_name").val()}if((d.post_title.length==0&&d.content.length==0)||d.post_title+d.content==autosaveLast){f=false}e=jQuery("#original_post_status").val();goodcats=([]);jQuery("[name='post_category[]']:checked").each(function(g){goodcats.push(this.value)});d.catslist=goodcats.join(",");if(jQuery("#comment_status").prop("checked")){d.comment_status="open"}if(jQuery("#ping_status").prop("checked")){d.ping_status="open"}if(jQuery("#excerpt").size()){d.excerpt=jQuery("#excerpt").val()}if(jQuery("#post_author").size()){d.post_author=jQuery("#post_author").val()}if(jQuery("#parent_id").val()){d.parent_id=jQuery("#parent_id").val()}d.user_ID=jQuery("#user-id").val();if(jQuery("#auto_draft").val()=="1"){d.auto_draft="1"}if(f){autosaveLast=d.post_title+d.content;jQuery(document).triggerHandler("wpcountwords",[d.content])}else{d.autosave=0}if(d.auto_draft=="1"){a=autosave_saved_new}else{a=autosave_saved}autosaveOldMessage=jQuery("#autosave").html();jQuery.ajax({data:d,beforeSend:f?autosave_loading:null,type:"POST",url:ajaxurl,success:a})};