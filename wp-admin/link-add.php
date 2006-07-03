<?php
require_once('admin.php');

$title = __('Add Bookmark');
$this_file = 'link-manager.php';
$parent_file = 'link-manager.php';


wp_reset_vars(array('action', 'cat_id', 'linkurl', 'name', 'image',
                       'description', 'visible', 'target', 'category', 'link_id',
                       'submit', 'order_by', 'links_show_cat_id', 'rating', 'rel',
                       'notes', 'linkcheck[]'));

wp_enqueue_script( array('xfn', 'dbx-admin-key?pagenow=link.php') );
if ( current_user_can( 'manage_categories' ) )
	wp_enqueue_script( 'ajaxcat' );
require('admin-header.php');
?>

<?php if ($_GET['added']) : ?>
<div id="message" class="updated fade"><p><?php _e('Bookmark added.'); ?></p></div>
<?php endif; ?>

<?php
	$link = get_default_link_to_edit();
	include('edit-link-form.php');
?>

<div class="wrap">
<?php printf(__('<p>You can drag <a href="%s" title="Bookmark add bookmarklet">Link This</a> to your toolbar and when you click it a window will pop up that will allow you to add whatever site you&#8217;re on to your bookmarks! Right now this only works on Mozilla or Netscape, but we&#8217;re working on it.</p>'), "javascript:void(linkmanpopup=window.open('" . get_settings('siteurl') . "/wp-admin/link-add.php?action=popup&amp;linkurl='+escape(location.href)+'&amp;name='+escape(document.title),'LinkManager','scrollbars=yes,width=750,height=550,left=15,top=15,status=yes,resizable=yes'));linkmanpopup.focus();window.focus();linkmanpopup.focus();") ?>
</div>

<?php
require('admin-footer.php');
?>
