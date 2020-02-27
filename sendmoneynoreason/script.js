(() => {
	let cardContent = "";
	for (let i = 0; i < 30; i++) {
		cardContent += `<div></div>`;
	}
	document.querySelector("#dollas").innerHTML += cardContent;

	// prevent iOS scroll
	document.addEventListener("touchmove", (e) => e.preventDefault(), false);

	let cards = document.querySelectorAll("#dollas > div:not(.nope)");
	let scoreEl = document.querySelector("#count span");
	let virtualPointerEl = document.querySelector("#simulate"),
		 virtualPointerChild = document.querySelector("#simulate div");

	let trackers = [], livenessCheckers = [];
	let zIndex = 1, count = 0, flyCount = 0;

	cards.forEach((el, i) => {
		trackers.push(setup(i, el));
	});

	function setup(i, el) {
		delete el.dataset.inFlight;
		["touchstart", "mousedown"].forEach((event) => {
			el.addEventListener(event, (e) => {
				let stacked = 3;
				cards.forEach((el) => {
					delete el.dataset.held;
					if (!el.dataset.inFlight) el.setAttribute("style", "");
				});
				el.dataset.held = true;
				if (zIndex >= 9999) zIndex = 1;
				el.dataset.zIndex = zIndex++;
				scoreEl.textContent = ++count;
				if (e.isTrusted && animation) {
					clearInterval(animation);
					animation = false;
				}
			});
		});
		["touchend", "mouseup"].forEach((event) => {
			el.addEventListener(event, (e) => {
				delete el.dataset.held;
				if (flyCount > 3) {
					el.style.pointerEvents = "none";
					setTimeout(() => {
						el.style.pointerEvents = null;
					}, 200);
				}
			});
		});
		return new Impetus({
			source: el,
			update: (x, y) => {
				if (!el.dataset.inFlight) {
					flyCount++;
					el.dataset.inFlight = true;
				}
				let v = x - (el.dataset.x || 0);
				let rot = (el.dataset.rot || 0)*0.9 + v/(1+Math.abs(v))*1.2;
				el.dataset.x = x;
				el.dataset.rot = rot;
				el.style.zIndex = el.dataset.zIndex;
				el.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;
				clearTimeout(livenessCheckers[i]);
				livenessCheckers[i] = cleanUpDead(i, el);
			},
			friction: 0.98
		});
	}


	function cleanUpDead(i, el) {
		return setTimeout(() => {
			if (el.dataset.held) {
				livenessCheckers[i] = cleanUpDead(i, el);
				return;
			}
			el.classList.add("gone");
			setTimeout(() => {
				trackers[i].setValues(0,0);
				el.setAttribute("style", "");
				el.classList.remove("gone");
				delete el.dataset.inFlight;
				flyCount--;
			}, 300);
		}, 300);
	}

	let animation = setInterval(() => {
		if (!document["hidden"]) swipeAnimation();
	}, 5000);

	let animationStart;
	function swipeAnimation(delay) {
		let fakeX = 0,
			 fakeY = -100,
			 direction = [Math.random()*4-2, Math.random()*0.5+0.8],
			 card = false;

		cards.forEach((el, i) => {
			if (!el.dataset.inFlight) {
				card = el;
			}
		});

		if (!card) return;

		virtualPointerEl.style.transform = `translate(${fakeX}px, ${fakeY}px) translateX(-50%)`;
		virtualPointerChild.classList.add("shown");

		setTimeout(() => {
			fakePointer(card, "touchstart", fakeX, fakeY);
			animationStart = Date.now();
			function advanceDragAnimation() {
				let t = (Date.now() - animationStart)/10;
				fakeX = -t*direction[0];
				fakeY = -Math.pow(t, 1.5)*direction[1]-100;
				virtualPointerEl.style.transform = `translate(${fakeX}px, ${fakeY}px) translateX(-50%)`;
				fakePointer(card, "touchmove", fakeX, fakeY);
				if (t > 40) {
					fakePointer(card, "touchend", fakeX, fakeY);
				} else {
					if (t > 30) {
						virtualPointerChild.classList.remove("shown");
					}
					requestAnimationFrame(advanceDragAnimation);
				}
			}
			requestAnimationFrame(advanceDragAnimation);
		}, 300);
	}

	function fakePointer(el, type, x, y) {
		let event = document.createEvent("Event");
		event.initEvent(type, true, true);
		event.targetTouches = [{
			identifier: "faked",
			clientX: x,
			clientY: y
		}];
		el.dispatchEvent(event);
	}
})();
