<?php
$title = 'Permalink Options';
$this_file = 'options.php';

function add_magic_quotes($array) {
	foreach ($array as $k => $v) {
		if (is_array($v)) {
			$array[$k] = add_magic_quotes($v);
		} else {
			$array[$k] = addslashes($v);
		}
	}
	return $array;
}

if (!get_magic_quotes_gpc()) {
	$HTTP_GET_VARS    = add_magic_quotes($HTTP_GET_VARS);
	$HTTP_POST_VARS   = add_magic_quotes($HTTP_POST_VARS);
	$HTTP_COOKIE_VARS = add_magic_quotes($HTTP_COOKIE_VARS);
}

$wpvarstoreset = array('action','standalone', 'option_group_id');
for ($i=0; $i<count($wpvarstoreset); $i += 1) {
	$wpvar = $wpvarstoreset[$i];
	if (!isset($$wpvar)) {
		if (empty($HTTP_POST_VARS["$wpvar"])) {
			if (empty($HTTP_GET_VARS["$wpvar"])) {
				$$wpvar = '';
			} else {
				$$wpvar = $HTTP_GET_VARS["$wpvar"];
			}
		} else {
			$$wpvar = $HTTP_POST_VARS["$wpvar"];
		}
	}
}

require_once('optionhandler.php');

if ($HTTP_POST_VARS['Submit'] == 'Update') {
	update_option('permalink_structure', $HTTP_POST_VARS['permalink_structure']);
	$permalink_structure = $HTTP_POST_VARS['permalink_structure'];
} else {
	$permalink_structure = get_settings('permalink_structure');
}


switch($action) {

default:
	$standalone = 0;
	include_once('admin-header.php');
	if ($user_level <= 3) {
		die("You have do not have sufficient permissions to edit the options for this blog.");
	}
?>
 <ul id="adminmenu2"> 
  <?php
    //we need to iterate through the available option groups.
    $option_groups = $wpdb->get_results("SELECT group_id, group_name, group_desc, group_longdesc FROM $tableoptiongroups ORDER BY group_id");
    foreach ($option_groups as $option_group) {
        if ($option_group->group_id == $option_group_id) {
            $current_desc=$option_group->group_desc;
            $current_long_desc = $option_group->group_longdesc;
            echo("  <li><a id=\"current2\" href=\"$this_file?option_group_id={$option_group->group_id}\" title=\"{$option_group->group_desc}\">{$option_group->group_name}</a></li>\n");
        } else {
            echo("  <li><a href=\"$this_file?option_group_id={$option_group->group_id}\" title=\"{$option_group->group_desc}\">{$option_group->group_name}</a></li>\n");
        }
    } // end for each group
?> 
  <li class="last"><a href="options-permalink.php">Permalinks</a></li> 
</ul> 
<br clear="all" /> 
<div class="wrap"> 
  <h2>Edit Permalink Structure</h2> 
  <p>WordPress offers you the ability to create a custom URI structure for your permalinks and archives. The following &#8220;tags&#8221; are available:</p> 
  <ul> 
    <li><code>%year%</code> --- The year of the post, 4 digits, for example <code>2004</code> </li> 
    <li><code>%monthnum%</code> --- Month of the year, for example <code>05</code></li> 
    <li><code>%day% </code>--- Day of the month, for example <code>28</code></li> 
    <li><code>%postname%</code> --- A sanitized version of the title of the post. So &quot;This Is A Great Post!&quot; becomes &quot;<code>this-is-a-great-post</code>&quot; in the URI </li> 
    <li><code>%post_id%</code> --- The unique ID # of the post, for example <code>423</code> <strong></strong></li> 
  </ul> 
  <p>So for example a value like <code>/archives/%year%/%monthnum%/%day%/%postname%/</code> could give you a permalink like <code>/archives/2003/05/23/my-cheese-sandwich/</code> . For this to work you'll need mod_rewrite installed on your server for the rule generation rule to work below. In the future there may be other options. </p> 
  <form name="form" action="options-permalink.php" method="post"> 
    <p>Use the template tags above to create a virtual site structure:</p> 
    <p> 
      <input name="permalink_structure" type="text" style="width: 100%;" value="<?php echo $permalink_structure; ?>" /> 
    </p> 
    <p> 
      <input type="submit" name="Submit" value="Update"> 
    </p> 
  </form> 
<?php
 if ($permalink_structure) {
?>
  <p>Using the permalink structure value you currently have, <code><?php echo $permalink_structure; ?></code>, these are the mod_rewrite rules you should have in your <code>.htaccess</code> file.</p> 
  <?php
$site_root = str_replace('http://', '', trim(get_settings('siteurl')));
$site_root = preg_replace('|([^/]*)(.*)|i', '$2', $site_root);
if ('/' != substr($site_root, -1)) $site_root = $site_root . '/';

$rewritecode = array(
	'%year%',
	'%monthnum%',
	'%day%',
	'%postname%',
	'%post_id%'
);
$rewritereplace = array(
	'([0-9]{4})?',
	'([0-9]{1,2})?',
	'([0-9]{1,2})?',
	'([0-9a-z-_]+)?',
	'([0-9]+)?'
);
$queryreplace = array (
	'year=',
	'monthnum=',
	'day=',
	'name=',
	'p='
);



$match = str_replace('/', '/?', $permalink_structure);
$match = preg_replace('|/[?]|', '', $match, 1);

$match = str_replace($rewritecode, $rewritereplace, $match);
$match = preg_replace('|[?]|', '', $match, 1);

$feedmatch = str_replace('?/?', '/', $match);
$trackbackmatch = $feedmatch;

preg_match_all('/%.+?%/', $permalink_structure, $tokens);

$query = 'index.php?';
$feedquery = 'wp-feed.php?';
$trackbackquery = 'wp-trackback.php?';
for ($i = 0; $i < count($tokens[0]); ++$i) {
	if (0 < $i) {
        $query .= '&';
        $feedquery .= '&';
        $trackbackquery .= '&';
    }

    $query_token = str_replace($rewritecode, $queryreplace, $tokens[0][$i]) . '$'. ($i + 1);
	$query .= $query_token;
	$feedquery .= $query_token;
	$trackbackquery .= $query_token;
}
++$i;

// Add post paged stuff
$match .= '([0-9]+)?/?';
$query .= "&page=$$i";

// Add post feed stuff
$feedregex = '(feed|rdf|rss|rss2|atom)/?';
$feedmatch .= $feedregex;
$feedquery .= "&feed=$$i";

// Add post trackback stuff
$trackbackregex = 'trackback/?';
$trackbackmatch .= $trackbackregex;

// Site feed
$sitefeedmatch = 'feed/?([0-9a-z-_]+)?/?$';
$sitefeedquery = $site_root . 'wp-feed.php?feed=$1';

// Site comment feed
$sitecommentfeedmatch = 'comments/feed/?([0-9a-z-_]+)?/?$';
$sitecommentfeedquery = $site_root . 'wp-feed.php?feed=$1&withcomments=1';

// Code for nice categories, currently not very flexible
$front = substr($permalink_structure, 0, strpos($permalink_structure, '%'));
		$catmatch = $front . 'category/';
		$catmatch = preg_replace('|^/+|', '', $catmatch);
		$authormatch = $front . 'author/';
		$authormatch = preg_replace('|^/+|', '', $authormatch);

?> 
<form action"">
  <textarea rows="5" style="width: 100%;">RewriteEngine On
RewriteBase <?php echo $site_root; ?> 
RewriteRule ^<?php echo $match; echo '$ ' . $site_root . $query ?> [QSA]
RewriteRule ^<?php echo $feedmatch; echo '$ ' . $site_root . $feedquery ?> [QSA]
RewriteRule ^<?php echo $trackbackmatch; echo '$ ' . $site_root . $trackbackquery ?> [QSA]
RewriteRule ^<?php echo $catmatch; ?>(.*)/<?php echo $feedregex ?>$ <?php echo $site_root; ?>wp-feed.php?category_name=$1&feed=$2 [QSA]
RewriteRule ^<?php echo $catmatch; ?>?(.*) <?php echo $site_root; ?>index.php?category_name=$1 [QSA]
RewriteRule ^<?php echo $authormatch; ?>(.*)/<?php echo $feedregex ?>$ <?php echo $site_root; ?>wp-feed.php?author_name=$1&feed=$2 [QSA]
RewriteRule ^<?php echo $authormatch; ?>?(.*) <?php echo $site_root; ?>index.php?author_name=$1 [QSA]
RewriteRule ^<?php echo $sitefeedmatch; ?> <?php echo $sitefeedquery ?> [QSA]
RewriteRule ^<?php echo $sitecommentfeedmatch; ?> <?php echo $sitecommentfeedquery ?> [QSA]</textarea>
	</form>
</div> 
<?php
} else {
?>
<p>
You are not currently using customized permalinks. No special mod_rewrite
rules are needed.
</p>
<?php
}
echo "</div>\n";

break;
}

include("admin-footer.php") ?> 
