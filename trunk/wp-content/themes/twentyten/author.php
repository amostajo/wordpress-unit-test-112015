<?php get_header(); ?>

		<div id="container">
			<div id="content">

<?php the_post(); ?>

				<h1 class="page-title author"><?php printf( __( 'Author Archives: <span class="vcard">%s</span>', 'twentyten' ), "<a class='url fn n' href='$authordata->user_url' title='" . esc_attr(get_the_author()) . "' rel='me'>" . get_the_author() . "</a>" ); ?></h1>

<?php if ( get_the_author_meta('description') ) : // If a user has filled out their decscription show a bio on their entries  ?>
					<div id="entry-author-info">
						<div id="author-avatar">
							<?php echo get_avatar( get_the_author_meta('user_email'), apply_filters('twentyten_author_bio_avatar_size', 60) ); ?>
						</div><!-- #author-avatar 	-->
						<div id="author-description">
							<h2><?php printf(__('About %s', 'twentyten'), get_the_author()); ?></h2>
							<?php the_author_meta('description'); ?>
						</div><!-- #author-description	-->
					</div><!-- .entry-author-info -->
<?php endif; ?>

<?php rewind_posts(); ?>

<?php get_generic_template( 'loop', 'author' ); ?>

			</div><!-- #content -->
		</div><!-- #container -->

<?php get_sidebar(); ?>
<?php get_footer(); ?>