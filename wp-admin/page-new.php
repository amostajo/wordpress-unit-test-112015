<?php
require_once('admin.php');
$title = __('New Page');
$parent_file = 'post-new.php';
$editing = true;
require_once('admin-header.php');
?>

<?php if ( isset($_GET['saved']) ) : ?>
<div id="message" class="updated fade"><p><strong><?php _e('Page saved.') ?> <a href="edit-pages.php"><?php _e('Manage pages &raquo;'); ?></a></strong></p></div>
<?php endif; ?>

<?php
if ( current_user_can('edit_pages') ) {
	$action = 'post';
	get_currentuserinfo();

	$post = get_default_post_to_edit();
	$post->post_type = 'page';

	include('edit-page-form.php');
}
?>

<?php include('admin-footer.php'); ?> 