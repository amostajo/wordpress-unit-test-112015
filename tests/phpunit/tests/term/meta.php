<?php

/**
 * @group taxonomy
 * @group meta
 * @ticket 10142
 */
class Tests_Term_Meta extends WP_UnitTestCase {
	public function setUp() {
		parent::setUp();
		register_taxonomy( 'wptests_tax', 'post' );
	}

	public function test_add() {
		$t = $this->factory->term->create( array( 'taxonomy' => 'wptests_tax' ) );

		$this->assertNotEmpty( add_term_meta( $t, 'foo', 'bar' ) );
	}

	public function test_add_unique() {
		$t = $this->factory->term->create( array( 'taxonomy' => 'wptests_tax' ) );

		$this->assertNotEmpty( add_term_meta( $t, 'foo', 'bar' ) );
		$this->assertFalse( add_term_meta( $t, 'foo', 'bar', true ) );
	}

	public function test_delete() {
		$t = $this->factory->term->create( array( 'taxonomy' => 'wptests_tax' ) );
		add_term_meta( $t, 'foo', 'bar' );

		$this->assertTrue( delete_term_meta( $t, 'foo' ) );
	}

	public function test_delete_with_invalid_meta_key_should_return_false() {
		$t = $this->factory->term->create( array( 'taxonomy' => 'wptests_tax' ) );

		$this->assertFalse( delete_term_meta( $t, 'foo' ) );
	}

	public function test_delete_should_respect_meta_value() {
		$t = $this->factory->term->create( array( 'taxonomy' => 'wptests_tax' ) );
		add_term_meta( $t, 'foo', 'bar' );
		add_term_meta( $t, 'foo', 'baz' );

		$this->assertTrue( delete_term_meta( $t, 'foo', 'bar' ) );

		$metas = get_term_meta( $t, 'foo', false );
		$this->assertSame( array( 'baz' ), $metas );
	}

	public function test_get_with_no_key_should_fetch_all_keys() {
		$t = $this->factory->term->create( array( 'taxonomy' => 'wptests_tax' ) );
		add_term_meta( $t, 'foo', 'bar' );
		add_term_meta( $t, 'foo1', 'baz' );

		$found = get_term_meta( $t );
		$expected = array(
			'foo' => array( 'bar' ),
			'foo1' => array( 'baz' ),
		);

		$this->assertEqualSets( $expected, $found );
	}

	public function test_get_with_key_should_fetch_all_for_key() {
		$t = $this->factory->term->create( array( 'taxonomy' => 'wptests_tax' ) );
		add_term_meta( $t, 'foo', 'bar' );
		add_term_meta( $t, 'foo', 'baz' );
		add_term_meta( $t, 'foo1', 'baz' );

		$found = get_term_meta( $t, 'foo' );
		$expected = array( 'bar', 'baz' );

		$this->assertEqualSets( $expected, $found );
	}

	public function test_get_should_respect_single_true() {
		$t = $this->factory->term->create( array( 'taxonomy' => 'wptests_tax' ) );
		add_term_meta( $t, 'foo', 'bar' );
		add_term_meta( $t, 'foo', 'baz' );

		$found = get_term_meta( $t, 'foo', true );
		$this->assertEquals( 'bar', $found );
	}

	public function test_update_should_pass_to_add_when_no_value_exists_for_key() {
		$t = $this->factory->term->create( array( 'taxonomy' => 'wptests_tax' ) );

		$actual = update_term_meta( $t, 'foo', 'bar' );
		$this->assertInternalType( 'int', $actual );
		$this->assertNotEmpty( $actual );

		$meta = get_term_meta( $t, 'foo', true );
		$this->assertSame( 'bar', $meta );
	}

	public function test_update_should_return_true_when_updating_existing_value_for_key() {
		$t = $this->factory->term->create( array( 'taxonomy' => 'wptests_tax' ) );

		add_term_meta( $t, 'foo', 'bar' );

		$actual = update_term_meta( $t, 'foo', 'baz' );
		$this->assertTrue( $actual );

		$meta = get_term_meta( $t, 'foo', true );
		$this->assertSame( 'baz', $meta );
	}

	public function test_term_meta_should_be_lazy_loaded_for_all_terms_in_wp_query_loop() {
		global $wpdb;

		$p = $this->factory->post->create( array( 'post_status' => 'publish' ) );

		register_taxonomy( 'wptests_tax', 'post' );
		$terms = $this->factory->term->create_many( 3, array( 'taxonomy' => 'wptests_tax' ) );
		wp_set_object_terms( $p, $terms, 'wptests_tax' );
		foreach ( $terms as $t ) {
			add_term_meta( $t, 'foo', 'bar' );
		}

		// Create another term, which should *not* be lazy loaded because it's unattached.
		$orphan_term = $this->factory->term->create( array( 'taxonomy' => 'wptests_tax' ) );
		add_term_meta( $orphan_term, 'foo', 'bar' );

		$this->go_to( get_permalink( $p ) );

		if ( have_posts() ) {
			while ( have_posts() ) {
				the_post();

				// First request will hit the database.
				$num_queries = $wpdb->num_queries;
				$this->assertSame( 'bar', get_term_meta( $terms[0], 'foo', true ) );
				$this->assertSame( $num_queries + 1, $wpdb->num_queries );

				// Second and third requests should be in cache.
				$this->assertSame( 'bar', get_term_meta( $terms[1], 'foo', true ) );
				$this->assertSame( 'bar', get_term_meta( $terms[2], 'foo', true ) );
				$this->assertSame( $num_queries + 1, $wpdb->num_queries );

				// Querying a term not primed should result in a hit.
				$this->assertSame( 'bar', get_term_meta( $orphan_term, 'foo', true ) );
				$this->assertSame( $num_queries + 2, $wpdb->num_queries );
			}
		}
	}
}
