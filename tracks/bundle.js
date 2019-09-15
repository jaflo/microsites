
(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function get_binding_group_value(group) {
        const value = [];
        for (let i = 0; i < group.length; i += 1) {
            if (group[i].checked)
                value.push(group[i].__value);
        }
        return value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.data !== data)
            text.data = data;
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function createEventDispatcher() {
        const component = current_component;
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, changed, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(changed, child_ctx);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, value) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    /* src/search/SongResult.svelte generated by Svelte v3.9.1 */

    const file = "src/search/SongResult.svelte";

    // (57:2) {:else}
    function create_else_block(ctx) {
    	var a, t;

    	return {
    		c: function create() {
    			a = element("a");
    			t = text("View lyrics");
    			attr(a, "href", ctx.track_share_url);
    			attr(a, "target", "_blank");
    			add_location(a, file, 57, 4, 1045);
    		},

    		m: function mount(target, anchor) {
    			insert(target, a, anchor);
    			append(a, t);
    		},

    		p: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(a);
    			}
    		}
    	};
    }

    // (55:2) {#if has_lyrics == 0}
    function create_if_block(ctx) {
    	var span;

    	return {
    		c: function create() {
    			span = element("span");
    			span.textContent = "No lyrics available";
    			attr(span, "class", "red svelte-gp6epy");
    			add_location(span, file, 55, 4, 986);
    		},

    		m: function mount(target, anchor) {
    			insert(target, span, anchor);
    		},

    		p: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(span);
    			}
    		}
    	};
    }

    function create_fragment(ctx) {
    	var label, input, input_type_value, input_name_value, input_id_value, input_disabled_value, t0, strong, t1, t2, t3, t4, label_for_value, dispose;

    	function select_block_type(changed, ctx) {
    		if (ctx.has_lyrics == 0) return create_if_block;
    		return create_else_block;
    	}

    	var current_block_type = select_block_type(null, ctx);
    	var if_block = current_block_type(ctx);

    	return {
    		c: function create() {
    			label = element("label");
    			input = element("input");
    			t0 = space();
    			strong = element("strong");
    			t1 = text(ctx.track_name);
    			t2 = text("\n  by ");
    			t3 = text(ctx.artist_name);
    			t4 = space();
    			if_block.c();
    			attr(input, "type", input_type_value = ctx.album ? 'checkbox' : 'radio');
    			input.value = ctx.i;
    			attr(input, "name", input_name_value = "q" + ctx.qid);
    			attr(input, "id", input_id_value = "t" + ctx.track_id);
    			input.disabled = input_disabled_value = ctx.has_lyrics == 0;
    			input.checked = ctx.album;
    			add_location(input, file, 44, 2, 729);
    			add_location(strong, file, 52, 2, 909);
    			attr(label, "for", label_for_value = "t" + ctx.track_id);
    			attr(label, "class", "svelte-gp6epy");
    			toggle_class(label, "faded", ctx.has_lyrics == 0);
    			add_location(label, file, 43, 0, 671);
    			dispose = listen(input, "change", ctx.changed);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, label, anchor);
    			append(label, input);
    			append(label, t0);
    			append(label, strong);
    			append(strong, t1);
    			append(label, t2);
    			append(label, t3);
    			append(label, t4);
    			if_block.m(label, null);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.album) && input_type_value !== (input_type_value = ctx.album ? 'checkbox' : 'radio')) {
    				attr(input, "type", input_type_value);
    			}

    			if (changed.i) {
    				input.value = ctx.i;
    			}

    			if ((changed.qid) && input_name_value !== (input_name_value = "q" + ctx.qid)) {
    				attr(input, "name", input_name_value);
    			}

    			if (changed.album) {
    				input.checked = ctx.album;
    			}

    			if (current_block_type === (current_block_type = select_block_type(changed, ctx)) && if_block) {
    				if_block.p(changed, ctx);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);
    				if (if_block) {
    					if_block.c();
    					if_block.m(label, null);
    				}
    			}

    			if (changed.has_lyrics) {
    				toggle_class(label, "faded", ctx.has_lyrics == 0);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(label);
    			}

    			if_block.d();
    			dispose();
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();

      let { song, i, qid, album = false } = $$props;

      let {
        track_id,
        track_name,
        artist_name,
        album_name,
        has_lyrics,
        track_share_url
      } = song;

      function changed(e) {
        if (e.target.checked) {
          dispatch("select", {
            track: track_id,
            query_index: qid,
            title: track_name,
            artist: artist_name
          });
        } else {
          dispatch("select", {
            track: -1,
            query_index: qid
          });
        }
      }

    	const writable_props = ['song', 'i', 'qid', 'album'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<SongResult> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('song' in $$props) $$invalidate('song', song = $$props.song);
    		if ('i' in $$props) $$invalidate('i', i = $$props.i);
    		if ('qid' in $$props) $$invalidate('qid', qid = $$props.qid);
    		if ('album' in $$props) $$invalidate('album', album = $$props.album);
    	};

    	return {
    		song,
    		i,
    		qid,
    		album,
    		track_id,
    		track_name,
    		artist_name,
    		has_lyrics,
    		track_share_url,
    		changed
    	};
    }

    class SongResult extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, ["song", "i", "qid", "album"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.song === undefined && !('song' in props)) {
    			console.warn("<SongResult> was created without expected prop 'song'");
    		}
    		if (ctx.i === undefined && !('i' in props)) {
    			console.warn("<SongResult> was created without expected prop 'i'");
    		}
    		if (ctx.qid === undefined && !('qid' in props)) {
    			console.warn("<SongResult> was created without expected prop 'qid'");
    		}
    	}

    	get song() {
    		throw new Error("<SongResult>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set song(value) {
    		throw new Error("<SongResult>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get i() {
    		throw new Error("<SongResult>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set i(value) {
    		throw new Error("<SongResult>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get qid() {
    		throw new Error("<SongResult>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set qid(value) {
    		throw new Error("<SongResult>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get album() {
    		throw new Error("<SongResult>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set album(value) {
    		throw new Error("<SongResult>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/search/SongQuery.svelte generated by Svelte v3.9.1 */

    const file$1 = "src/search/SongQuery.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.song = list[i];
    	child_ctx.i = i;
    	return child_ctx;
    }

    // (25:0) {:else}
    function create_else_block$1(ctx) {
    	var t;

    	return {
    		c: function create() {
    			t = text("No results");
    		},

    		m: function mount(target, anchor) {
    			insert(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(t);
    			}
    		}
    	};
    }

    // (23:0) {#each songs as song, i}
    function create_each_block(ctx) {
    	var current;

    	var songresult = new SongResult({
    		props: {
    		song: ctx.song,
    		qid: ctx.qid,
    		i: ctx.i
    	},
    		$$inline: true
    	});
    	songresult.$on("select", ctx.select_handler);

    	return {
    		c: function create() {
    			songresult.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(songresult, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var songresult_changes = {};
    			if (changed.songs) songresult_changes.song = ctx.song;
    			if (changed.qid) songresult_changes.qid = ctx.qid;
    			songresult.$set(songresult_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(songresult.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(songresult.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(songresult, detaching);
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	var label, input, input_name_value, input_id_value, t0, label_for_value, t1, each_1_anchor, current, dispose;

    	var each_value = ctx.songs;

    	var each_blocks = [];

    	for (var i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	var each_1_else = null;

    	if (!each_value.length) {
    		each_1_else = create_else_block$1();
    		each_1_else.c();
    	}

    	return {
    		c: function create() {
    			label = element("label");
    			input = element("input");
    			t0 = text("\n  Do not save");
    			t1 = space();

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			attr(input, "type", "radio");
    			input.value = -1;
    			attr(input, "name", input_name_value = "q" + ctx.qid);
    			attr(input, "id", input_id_value = "" + ctx.qid + "-skip");
    			input.checked = true;
    			add_location(input, file$1, 9, 2, 218);
    			attr(label, "for", label_for_value = "" + ctx.qid + "-skip");
    			add_location(label, file$1, 8, 0, 191);
    			dispose = listen(input, "change", ctx.change_handler);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, label, anchor);
    			append(label, input);
    			append(label, t0);
    			insert(target, t1, anchor);

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);

    			if (each_1_else) {
    				each_1_else.m(target, anchor);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if ((!current || changed.qid) && input_name_value !== (input_name_value = "q" + ctx.qid)) {
    				attr(input, "name", input_name_value);
    			}

    			if ((!current || changed.qid) && input_id_value !== (input_id_value = "" + ctx.qid + "-skip")) {
    				attr(input, "id", input_id_value);
    			}

    			if ((!current || changed.qid) && label_for_value !== (label_for_value = "" + ctx.qid + "-skip")) {
    				attr(label, "for", label_for_value);
    			}

    			if (changed.songs || changed.qid) {
    				each_value = ctx.songs;

    				for (var i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();
    				for (i = each_value.length; i < each_blocks.length; i += 1) out(i);
    				check_outros();
    			}

    			if (each_value.length) {
    				if (each_1_else) {
    					each_1_else.d(1);
    					each_1_else = null;
    				}
    			} else if (!each_1_else) {
    				each_1_else = create_else_block$1();
    				each_1_else.c();
    				each_1_else.m(each_1_anchor.parentNode, each_1_anchor);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (var i = 0; i < each_value.length; i += 1) transition_in(each_blocks[i]);

    			current = true;
    		},

    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < each_blocks.length; i += 1) transition_out(each_blocks[i]);

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(label);
    				detach(t1);
    			}

    			destroy_each(each_blocks, detaching);

    			if (detaching) {
    				detach(each_1_anchor);
    			}

    			if (each_1_else) each_1_else.d(detaching);

    			dispose();
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	
      const dispatch = createEventDispatcher();

      let { q, qid, songs } = $$props;

    	const writable_props = ['q', 'qid', 'songs'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<SongQuery> was created with unknown prop '${key}'`);
    	});

    	function select_handler(event) {
    		bubble($$self, event);
    	}

    	function change_handler(e) {
    	      if (e.target.checked) {
    	        dispatch('select', { track: -1, query_index: qid });
    	      }
    	    }

    	$$self.$set = $$props => {
    		if ('q' in $$props) $$invalidate('q', q = $$props.q);
    		if ('qid' in $$props) $$invalidate('qid', qid = $$props.qid);
    		if ('songs' in $$props) $$invalidate('songs', songs = $$props.songs);
    	};

    	return {
    		dispatch,
    		q,
    		qid,
    		songs,
    		select_handler,
    		change_handler
    	};
    }

    class SongQuery extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, ["q", "qid", "songs"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.q === undefined && !('q' in props)) {
    			console.warn("<SongQuery> was created without expected prop 'q'");
    		}
    		if (ctx.qid === undefined && !('qid' in props)) {
    			console.warn("<SongQuery> was created without expected prop 'qid'");
    		}
    		if (ctx.songs === undefined && !('songs' in props)) {
    			console.warn("<SongQuery> was created without expected prop 'songs'");
    		}
    	}

    	get q() {
    		throw new Error("<SongQuery>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set q(value) {
    		throw new Error("<SongQuery>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get qid() {
    		throw new Error("<SongQuery>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set qid(value) {
    		throw new Error("<SongQuery>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get songs() {
    		throw new Error("<SongQuery>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set songs(value) {
    		throw new Error("<SongQuery>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const apiKey = "34f99f63255db699b1a1497c899540f9";
    const base = "https://api.musixmatch.com/ws/1.1/";

    function encode(obj) {
      obj["apikey"] = apiKey;
      return Object.keys(obj)
        .map(function(key) {
          return key + "=" + encodeURIComponent(obj[key]);
        })
        .join("&");
    }

    const searchSong = params => {
      return fetch(base + "track.search?" + encode(params))
        .then(response => {
          return response.json();
        })
        .then(response => {
          return response.message.body.track_list;
        });
    };

    const searchArtist = params => {
      return fetch(base + "artist.search?" + encode(params))
        .then(response => {
          return response.json();
        })
        .then(response => {
          return response.message.body.artist_list;
        });
    };

    const findAlbums = params => {
      return fetch(base + "artist.albums.get?" + encode(params))
        .then(response => {
          return response.json();
        })
        .then(response => {
          return response.message.body.album_list;
        });
    };

    const albumTracks = params => {
      return fetch(base + "album.tracks.get?" + encode(params))
        .then(response => {
          return response.json();
        })
        .then(response => {
          return response.message.body.track_list;
        });
    };

    /* src/search/ArtistQuery.svelte generated by Svelte v3.9.1 */

    const file$2 = "src/search/ArtistQuery.svelte";

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.song = list[i];
    	child_ctx.i = i;
    	return child_ctx;
    }

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.album = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.a = list[i];
    	return child_ctx;
    }

    // (92:4) {#if a.artist_alias_list.length > 0}
    function create_if_block_2(ctx) {
    	var em, t0, t1_value = ctx.a.artist_alias_list
              .map(func)
              .join(', ') + "", t1, t2;

    	return {
    		c: function create() {
    			em = element("em");
    			t0 = text("(also known as ");
    			t1 = text(t1_value);
    			t2 = text(")");
    			add_location(em, file$2, 92, 6, 2313);
    		},

    		m: function mount(target, anchor) {
    			insert(target, em, anchor);
    			append(em, t0);
    			append(em, t1);
    			append(em, t2);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.artists) && t1_value !== (t1_value = ctx.a.artist_alias_list
              .map(func)
              .join(', ') + "")) {
    				set_data(t1, t1_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(em);
    			}
    		}
    	};
    }

    // (80:0) {#each artists as a}
    function create_each_block_2(ctx) {
    	var div, input, input_value_value, input_name_value, input_id_value, t0, a, t1_value = ctx.a.artist_name + "", t1, a_href_value, t2, t3_value = flag(ctx.a.artist_country) + "", t3, t4, dispose;

    	var if_block = (ctx.a.artist_alias_list.length > 0) && create_if_block_2(ctx);

    	return {
    		c: function create() {
    			div = element("div");
    			input = element("input");
    			t0 = space();
    			a = element("a");
    			t1 = text(t1_value);
    			t2 = space();
    			t3 = text(t3_value);
    			t4 = space();
    			if (if_block) if_block.c();
    			ctx.$$binding_groups[1].push(input);
    			attr(input, "type", "radio");
    			input.__value = input_value_value = ctx.a.artist_id;
    			input.value = input.__value;
    			attr(input, "name", input_name_value = "q" + ctx.qid);
    			attr(input, "id", input_id_value = "" + ctx.qid + "-" + ctx.a.artist_id);
    			add_location(input, file$2, 81, 4, 1993);
    			attr(a, "href", a_href_value = "https://www.musixmatch.com/artist/" + ctx.a.artist_id);
    			attr(a, "target", "_blank");
    			add_location(a, file$2, 87, 4, 2131);
    			add_location(div, file$2, 80, 2, 1983);
    			dispose = listen(input, "change", ctx.input_change_handler);
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    			append(div, input);

    			input.checked = input.__value === ctx.selected;

    			append(div, t0);
    			append(div, a);
    			append(a, t1);
    			append(div, t2);
    			append(div, t3);
    			append(div, t4);
    			if (if_block) if_block.m(div, null);
    		},

    		p: function update(changed, ctx) {
    			if (changed.selected) input.checked = input.__value === ctx.selected;

    			if ((changed.artists) && input_value_value !== (input_value_value = ctx.a.artist_id)) {
    				input.__value = input_value_value;
    			}

    			input.value = input.__value;

    			if ((changed.qid) && input_name_value !== (input_name_value = "q" + ctx.qid)) {
    				attr(input, "name", input_name_value);
    			}

    			if ((changed.qid || changed.artists) && input_id_value !== (input_id_value = "" + ctx.qid + "-" + ctx.a.artist_id)) {
    				attr(input, "id", input_id_value);
    			}

    			if ((changed.artists) && t1_value !== (t1_value = ctx.a.artist_name + "")) {
    				set_data(t1, t1_value);
    			}

    			if ((changed.artists) && a_href_value !== (a_href_value = "https://www.musixmatch.com/artist/" + ctx.a.artist_id)) {
    				attr(a, "href", a_href_value);
    			}

    			if ((changed.artists) && t3_value !== (t3_value = flag(ctx.a.artist_country) + "")) {
    				set_data(t3, t3_value);
    			}

    			if (ctx.a.artist_alias_list.length > 0) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    				} else {
    					if_block = create_if_block_2(ctx);
    					if_block.c();
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}

    			ctx.$$binding_groups[1].splice(ctx.$$binding_groups[1].indexOf(input), 1);
    			if (if_block) if_block.d();
    			dispose();
    		}
    	};
    }

    // (101:0) {#if selected > -1}
    function create_if_block$1(ctx) {
    	var h4, t0, t1, t2, t3, each_1_anchor, current;

    	var each_value = ctx.albums;

    	var each_blocks = [];

    	for (var i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c: function create() {
    			h4 = element("h4");
    			t0 = text("Albums (");
    			t1 = text(ctx.selected);
    			t2 = text(")");
    			t3 = space();

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			add_location(h4, file$2, 101, 2, 2483);
    		},

    		m: function mount(target, anchor) {
    			insert(target, h4, anchor);
    			append(h4, t0);
    			append(h4, t1);
    			append(h4, t2);
    			insert(target, t3, anchor);

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (!current || changed.selected) {
    				set_data(t1, ctx.selected);
    			}

    			if (changed.albums || changed.selected_albums) {
    				each_value = ctx.albums;

    				for (var i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();
    				for (i = each_value.length; i < each_blocks.length; i += 1) out(i);
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (var i = 0; i < each_value.length; i += 1) transition_in(each_blocks[i]);

    			current = true;
    		},

    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < each_blocks.length; i += 1) transition_out(each_blocks[i]);

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(h4);
    				detach(t3);
    			}

    			destroy_each(each_blocks, detaching);

    			if (detaching) {
    				detach(each_1_anchor);
    			}
    		}
    	};
    }

    // (114:6) {#if album.songs.length > 0}
    function create_if_block_1(ctx) {
    	var each_1_anchor, current;

    	var each_value_1 = ctx.album.songs;

    	var each_blocks = [];

    	for (var i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c: function create() {
    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.albums) {
    				each_value_1 = ctx.album.songs;

    				for (var i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();
    				for (i = each_value_1.length; i < each_blocks.length; i += 1) out(i);
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (var i = 0; i < each_value_1.length; i += 1) transition_in(each_blocks[i]);

    			current = true;
    		},

    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < each_blocks.length; i += 1) transition_out(each_blocks[i]);

    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);

    			if (detaching) {
    				detach(each_1_anchor);
    			}
    		}
    	};
    }

    // (115:8) {#each album.songs as song, i}
    function create_each_block_1(ctx) {
    	var current;

    	var songresult = new SongResult({
    		props: {
    		i: ctx.i,
    		song: ctx.song,
    		album: true,
    		qid: "" + ctx.album.album_id + "-" + ctx.song.track_id
    	},
    		$$inline: true
    	});
    	songresult.$on("select", ctx.select_handler);

    	return {
    		c: function create() {
    			songresult.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(songresult, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var songresult_changes = {};
    			if (changed.albums) songresult_changes.song = ctx.song;
    			if (changed.albums) songresult_changes.qid = "" + ctx.album.album_id + "-" + ctx.song.track_id;
    			songresult.$set(songresult_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(songresult.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(songresult.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(songresult, detaching);
    		}
    	};
    }

    // (103:2) {#each albums as album}
    function create_each_block$1(ctx) {
    	var label, input, input_id_value, input_value_value, t0, t1_value = ctx.album.album_name + "", t1, label_for_value, t2, div, t3, current, dispose;

    	var if_block = (ctx.album.songs.length > 0) && create_if_block_1(ctx);

    	return {
    		c: function create() {
    			label = element("label");
    			input = element("input");
    			t0 = space();
    			t1 = text(t1_value);
    			t2 = space();
    			div = element("div");
    			if (if_block) if_block.c();
    			t3 = space();
    			ctx.$$binding_groups[0].push(input);
    			attr(input, "type", "checkbox");
    			attr(input, "id", input_id_value = "a" + ctx.album.album_id);
    			input.__value = input_value_value = ctx.album.album_id;
    			input.value = input.__value;
    			add_location(input, file$2, 104, 6, 2580);
    			attr(label, "for", label_for_value = "a" + ctx.album.album_id);
    			add_location(label, file$2, 103, 4, 2542);
    			attr(div, "class", "songs svelte-z8xf4r");
    			add_location(div, file$2, 112, 4, 2787);

    			dispose = [
    				listen(input, "change", ctx.input_change_handler_1),
    				listen(input, "change", ctx.albumChange)
    			];
    		},

    		m: function mount(target, anchor) {
    			insert(target, label, anchor);
    			append(label, input);

    			input.checked = ~ctx.selected_albums.indexOf(input.__value);

    			append(label, t0);
    			append(label, t1);
    			insert(target, t2, anchor);
    			insert(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    			append(div, t3);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.selected_albums) input.checked = ~ctx.selected_albums.indexOf(input.__value);

    			if ((!current || changed.albums) && input_id_value !== (input_id_value = "a" + ctx.album.album_id)) {
    				attr(input, "id", input_id_value);
    			}

    			if ((!current || changed.albums) && input_value_value !== (input_value_value = ctx.album.album_id)) {
    				input.__value = input_value_value;
    			}

    			input.value = input.__value;

    			if ((!current || changed.albums) && t1_value !== (t1_value = ctx.album.album_name + "")) {
    				set_data(t1, t1_value);
    			}

    			if ((!current || changed.albums) && label_for_value !== (label_for_value = "a" + ctx.album.album_id)) {
    				attr(label, "for", label_for_value);
    			}

    			if (ctx.album.songs.length > 0) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div, t3);
    				}
    			} else if (if_block) {
    				group_outros();
    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(label);
    			}

    			ctx.$$binding_groups[0].splice(ctx.$$binding_groups[0].indexOf(input), 1);

    			if (detaching) {
    				detach(t2);
    				detach(div);
    			}

    			if (if_block) if_block.d();
    			run_all(dispose);
    		}
    	};
    }

    function create_fragment$2(ctx) {
    	var t, if_block_anchor, current;

    	var each_value_2 = ctx.artists;

    	var each_blocks = [];

    	for (var i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	var if_block = (ctx.selected > -1) && create_if_block$1(ctx);

    	return {
    		c: function create() {
    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, t, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.artists || changed.flag || changed.qid || changed.selected) {
    				each_value_2 = ctx.artists;

    				for (var i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(t.parentNode, t);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value_2.length;
    			}

    			if (ctx.selected > -1) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();
    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);

    			if (detaching) {
    				detach(t);
    			}

    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach(if_block_anchor);
    			}
    		}
    	};
    }

    function flag(country) {
      if (!country) return "🏳️";

      // https://medium.com/binary-passion/lets-turn-an-iso-country-code-into-a-unicode-emoji-shall-we-870c16e05aad
      return country
        .toUpperCase()
        .replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397));
    }

    function func(e) {
    	return e.artist_alias;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	
      const dispatch = createEventDispatcher();

      let { artists, qid } = $$props;
      let selected = -1,
        lastSelected = -1;
      let albums = [],
        selected_albums = [];

      function albumChange(event) {
        if (event.target.checked) {
          albums.forEach(a => {
            if (a.album_id == parseInt(event.target.value)) {
              // found it
              if (a.songs.length > 0) return;
              albumTracks({
                album_id: a.album_id,
                page_size: 100,
                f_has_lyrics: true
              }).then(function(more) {
                if (!more) return;
                a.songs = [...a.songs, ...more.map(e => e.track)];
                $$invalidate('albums', albums), $$invalidate('lastSelected', lastSelected), $$invalidate('selected', selected); // ugh

                more
                  .map(e => e.track)
                  .forEach(t => {
                    dispatch("select", {
                      track: t.track_id,
                      query_index: a.album_id + "-" + t.track_id,
                      title: t.track_name,
                      artist: t.artist_name
                    });
                  });
              });
              return;
            }
          });
        }
      }

    	const writable_props = ['artists', 'qid'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<ArtistQuery> was created with unknown prop '${key}'`);
    	});

    	const $$binding_groups = [[], []];

    	function select_handler(event) {
    		bubble($$self, event);
    	}

    	function input_change_handler() {
    		selected = this.__value;
    		$$invalidate('selected', selected);
    	}

    	function input_change_handler_1() {
    		selected_albums = get_binding_group_value($$binding_groups[0]);
    		$$invalidate('selected_albums', selected_albums);
    	}

    	$$self.$set = $$props => {
    		if ('artists' in $$props) $$invalidate('artists', artists = $$props.artists);
    		if ('qid' in $$props) $$invalidate('qid', qid = $$props.qid);
    	};

    	$$self.$$.update = ($$dirty = { lastSelected: 1, selected: 1, albums: 1 }) => {
    		if ($$dirty.lastSelected || $$dirty.selected || $$dirty.albums) { if (lastSelected != selected) {
            $$invalidate('lastSelected', lastSelected = selected);
            $$invalidate('albums', albums = []);
            findAlbums({
              artist_id: selected,
              page_size: 10,
              s_release_date: "desc"
            }).then(function(more) {
              if (!more) return;
              $$invalidate('albums', albums = [
                ...albums,
                ...more.map(e => ({
                  ...e.album,
                  songs: []
                }))
              ]);
            });
          } }
    	};

    	return {
    		artists,
    		qid,
    		selected,
    		albums,
    		selected_albums,
    		albumChange,
    		select_handler,
    		input_change_handler,
    		input_change_handler_1,
    		$$binding_groups
    	};
    }

    class ArtistQuery extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, ["artists", "qid"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.artists === undefined && !('artists' in props)) {
    			console.warn("<ArtistQuery> was created without expected prop 'artists'");
    		}
    		if (ctx.qid === undefined && !('qid' in props)) {
    			console.warn("<ArtistQuery> was created without expected prop 'qid'");
    		}
    	}

    	get artists() {
    		throw new Error("<ArtistQuery>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set artists(value) {
    		throw new Error("<ArtistQuery>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get qid() {
    		throw new Error("<ArtistQuery>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set qid(value) {
    		throw new Error("<ArtistQuery>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.9.1 */
    const { Object: Object_1 } = globals;

    const file$3 = "src/App.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = Object_1.create(ctx);
    	child_ctx.q = list[i];
    	child_ctx.qid = i;
    	return child_ctx;
    }

    // (127:4) {:else}
    function create_else_block$2(ctx) {
    	var current;

    	var artistquery = new ArtistQuery({
    		props: {
    		artists: ctx.q.artists,
    		qid: ctx.qid
    	},
    		$$inline: true
    	});
    	artistquery.$on("select", ctx.handleSelection);

    	return {
    		c: function create() {
    			artistquery.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(artistquery, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var artistquery_changes = {};
    			if (changed.queries) artistquery_changes.artists = ctx.q.artists;
    			if (changed.queries) artistquery_changes.qid = ctx.qid;
    			artistquery.$set(artistquery_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(artistquery.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(artistquery.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(artistquery, detaching);
    		}
    	};
    }

    // (125:4) {#if q.type == 'song'}
    function create_if_block_1$1(ctx) {
    	var current;

    	var songquery = new SongQuery({
    		props: {
    		q: ctx.q.q,
    		qid: ctx.qid,
    		songs: ctx.q.songs
    	},
    		$$inline: true
    	});
    	songquery.$on("select", ctx.handleSelection);

    	return {
    		c: function create() {
    			songquery.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(songquery, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var songquery_changes = {};
    			if (changed.queries) songquery_changes.q = ctx.q.q;
    			if (changed.queries) songquery_changes.qid = ctx.qid;
    			if (changed.queries) songquery_changes.songs = ctx.q.songs;
    			songquery.$set(songquery_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(songquery.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(songquery.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(songquery, detaching);
    		}
    	};
    }

    // (121:0) {#each queries as q, qid (q)}
    function create_each_block$2(key_1, ctx) {
    	var div, h3, t0_value = ctx.q.q + "", t0, t1, current_block_type_index, if_block, current;

    	var if_block_creators = [
    		create_if_block_1$1,
    		create_else_block$2
    	];

    	var if_blocks = [];

    	function select_block_type(changed, ctx) {
    		if (ctx.q.type == 'song') return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(null, ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		key: key_1,

    		first: null,

    		c: function create() {
    			div = element("div");
    			h3 = element("h3");
    			t0 = text(t0_value);
    			t1 = space();
    			if_block.c();
    			add_location(h3, file$3, 122, 4, 2849);
    			add_location(div, file$3, 121, 2, 2839);
    			this.first = div;
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    			append(div, h3);
    			append(h3, t0);
    			append(div, t1);
    			if_blocks[current_block_type_index].m(div, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if ((!current || changed.queries) && t0_value !== (t0_value = ctx.q.q + "")) {
    				set_data(t0, t0_value);
    			}

    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(changed, ctx);
    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(changed, ctx);
    			} else {
    				group_outros();
    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});
    				check_outros();

    				if_block = if_blocks[current_block_type_index];
    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}
    				transition_in(if_block, 1);
    				if_block.m(div, null);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}

    			if_blocks[current_block_type_index].d();
    		}
    	};
    }

    // (133:0) {#if queries.length > 0}
    function create_if_block$2(ctx) {
    	var button, t0, t1, t2, t3_value = ctx.count == 1 ? 'song' : 'songs' + "", t3, dispose;

    	return {
    		c: function create() {
    			button = element("button");
    			t0 = text("Export ");
    			t1 = text(ctx.count);
    			t2 = text(" selected ");
    			t3 = text(t3_value);
    			add_location(button, file$3, 133, 2, 3113);
    			dispose = listen(button, "click", ctx.exportTrackList);
    		},

    		m: function mount(target, anchor) {
    			insert(target, button, anchor);
    			append(button, t0);
    			append(button, t1);
    			append(button, t2);
    			append(button, t3);
    		},

    		p: function update(changed, ctx) {
    			if (changed.count) {
    				set_data(t1, ctx.count);
    			}

    			if ((changed.count) && t3_value !== (t3_value = ctx.count == 1 ? 'song' : 'songs' + "")) {
    				set_data(t3, t3_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(button);
    			}

    			dispose();
    		}
    	};
    }

    function create_fragment$3(ctx) {
    	var h1, t1, form0, h20, t3, textarea0, t4, button0, t6, form1, h21, t8, textarea1, t9, button1, t11, each_blocks = [], each_1_lookup = new Map(), t12, if_block_anchor, current, dispose;

    	var each_value = ctx.queries;

    	const get_key = ctx => ctx.q;

    	for (var i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$2(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$2(key, child_ctx));
    	}

    	var if_block = (ctx.queries.length > 0) && create_if_block$2(ctx);

    	return {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Export IDs";
    			t1 = space();
    			form0 = element("form");
    			h20 = element("h2");
    			h20.textContent = "Song Title";
    			t3 = text("\n  You can enter more than one title on separate lines for bulk searches:\n  ");
    			textarea0 = element("textarea");
    			t4 = space();
    			button0 = element("button");
    			button0.textContent = "Suggest titles";
    			t6 = space();
    			form1 = element("form");
    			h21 = element("h2");
    			h21.textContent = "Artist";
    			t8 = text("\n  You can enter more than one artist on separate lines for bulk searches:\n  ");
    			textarea1 = element("textarea");
    			t9 = space();
    			button1 = element("button");
    			button1.textContent = "Suggest artists";
    			t11 = space();

    			for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].c();

    			t12 = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			add_location(h1, file$3, 104, 0, 2312);
    			add_location(h20, file$3, 107, 2, 2381);
    			attr(textarea0, "class", "svelte-13h320i");
    			add_location(textarea0, file$3, 109, 2, 2476);
    			attr(button0, "type", "submit");
    			add_location(button0, file$3, 110, 2, 2514);
    			add_location(form0, file$3, 106, 0, 2333);
    			add_location(h21, file$3, 114, 2, 2619);
    			attr(textarea1, "class", "svelte-13h320i");
    			add_location(textarea1, file$3, 116, 2, 2711);
    			attr(button1, "type", "submit");
    			add_location(button1, file$3, 117, 2, 2751);
    			add_location(form1, file$3, 113, 0, 2569);

    			dispose = [
    				listen(textarea0, "input", ctx.textarea0_input_handler),
    				listen(form0, "submit", prevent_default(ctx.searchSongs)),
    				listen(textarea1, "input", ctx.textarea1_input_handler),
    				listen(form1, "submit", prevent_default(ctx.searchArtists))
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, h1, anchor);
    			insert(target, t1, anchor);
    			insert(target, form0, anchor);
    			append(form0, h20);
    			append(form0, t3);
    			append(form0, textarea0);

    			set_input_value(textarea0, ctx.songNames);

    			append(form0, t4);
    			append(form0, button0);
    			insert(target, t6, anchor);
    			insert(target, form1, anchor);
    			append(form1, h21);
    			append(form1, t8);
    			append(form1, textarea1);

    			set_input_value(textarea1, ctx.artistNames);

    			append(form1, t9);
    			append(form1, button1);
    			insert(target, t11, anchor);

    			for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].m(target, anchor);

    			insert(target, t12, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.songNames) set_input_value(textarea0, ctx.songNames);
    			if (changed.artistNames) set_input_value(textarea1, ctx.artistNames);

    			const each_value = ctx.queries;

    			group_outros();
    			each_blocks = update_keyed_each(each_blocks, changed, get_key, 1, ctx, each_value, each_1_lookup, t12.parentNode, outro_and_destroy_block, create_each_block$2, t12, get_each_context$2);
    			check_outros();

    			if (ctx.queries.length > 0) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (var i = 0; i < each_value.length; i += 1) transition_in(each_blocks[i]);

    			current = true;
    		},

    		o: function outro(local) {
    			for (i = 0; i < each_blocks.length; i += 1) transition_out(each_blocks[i]);

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(h1);
    				detach(t1);
    				detach(form0);
    				detach(t6);
    				detach(form1);
    				detach(t11);
    			}

    			for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].d(detaching);

    			if (detaching) {
    				detach(t12);
    			}

    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach(if_block_anchor);
    			}

    			run_all(dispose);
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	

      let artistNames = "";

      let songNames = "";
      let queries = [];

      let selection = {};
      let count = 0;

      function searchSongs() {
        songNames
          .trim()
          .split("\n")
          .forEach(q => {
            searchSong({
              q_track_artist: q.replace(/ *\([^)]*\) */g, ""),
              page_size: 5,
              page: 1,
              s_track_rating: "desc"
            }).then(function(tracks) {
              $$invalidate('queries', queries = [
                ...queries,
                {
                  q: q,
                  type: "song",
                  songs: tracks.map(e => e.track),
                  selected: -1
                }
              ]);
            });
          });
        $$invalidate('songNames', songNames = "");
      }

      function searchArtists() {
        artistNames
          .trim()
          .split("\n")
          .forEach(q => {
            searchArtist({
              q_artist: q.replace(/ *\([^)]*\) */g, ""),
              page_size: 5,
              page: 1
            }).then(function(artists) {
              $$invalidate('queries', queries = [
                ...queries,
                {
                  q: q,
                  type: "artist",
                  artists: artists.map(e => e.artist)
                }
              ]);
            });
          });
        $$invalidate('artistNames', artistNames = "");
      }

      function handleSelection(event) {
        if (event.detail.track == -1) {
          delete selection[event.detail.query_index];
        } else {
          selection[event.detail.query_index] = {
            id: event.detail.track,
            title: event.detail.title,
            artist: event.detail.artist
          };    }
        $$invalidate('count', count = Object.keys(selection).length);
      }

      function exportTrackList() {
        let text = "id\ttitle\tartist\t\n";
        let trackIds = [];
        for (let key in selection) {
          if (selection.hasOwnProperty(key)) {
            const e = selection[key];
            text += e.id + "\t";
            text += e.title + "\t";
            text += e.artist + "\n";

            trackIds.push(e.id);
          }
        }
        window.prompt("Track IDs for script:", trackIds.join(","));
        window.open(
          "data:text/csv;charset=utf-8," + encodeURIComponent(text),
          "_blank"
        );
      }

    	function textarea0_input_handler() {
    		songNames = this.value;
    		$$invalidate('songNames', songNames);
    	}

    	function textarea1_input_handler() {
    		artistNames = this.value;
    		$$invalidate('artistNames', artistNames);
    	}

    	return {
    		artistNames,
    		songNames,
    		queries,
    		count,
    		searchSongs,
    		searchArtists,
    		handleSelection,
    		exportTrackList,
    		textarea0_input_handler,
    		textarea1_input_handler
    	};
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, []);
    	}
    }

    const app = new App({
      target: document.body,
      props: {
        name: "world"
      }
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
