function WPSetAsThumbnail(id){
	var $link = jQuery('#media-item-' + id + ' a.wp-post-thumbnail');

	$link.text( setPostThumbnailL10n.saving );
	jQuery.post(ajaxurl, {
		action:"set-post-thumbnail", post_id: post_id, thumbnail_id: id, cookie: encodeURIComponent(document.cookie)
	}, function(str){
		var win = window.dialogArguments || opener || parent || top;
		$link.text( setPostThumbnailL10n.setThumbnail );
		if ( str == '0' ) {
			alert( setPostThumbnailL10n.error );
		} else {
			jQuery('a.wp-post-thumbnail').show();
			$link.hide();
			win.WPSetThumbnailID(id);
			win.WPSetThumbnailHTML(str);
		}
	}
	);
}
