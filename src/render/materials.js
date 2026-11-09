import * as THREE from "three";

/**
 * Translucent membrane with a Fresnel rim, so the interior of the terminal and
 * spine stays visible while their silhouettes read clearly.
 * @param {{color: string|number, rim: string|number, opacity?: number}} options
 */
export function createMembraneMaterial({ color, rim, opacity = 1 }) {
	return new THREE.ShaderMaterial({
		uniforms: {
			uColor: { value: new THREE.Color(color) },
			uRim: { value: new THREE.Color(rim) },
			uOpacity: { value: opacity },
			uFlash: { value: 0 },
			uFlashColor: { value: new THREE.Color("#ffd27a") },
		},
		vertexShader: /* glsl */ `
			varying vec3 vNormal;
			varying vec3 vView;
			void main() {
				vec4 mv = modelViewMatrix * vec4(position, 1.0);
				vNormal = normalize(normalMatrix * normal);
				vView = normalize(-mv.xyz);
				gl_Position = projectionMatrix * mv;
			}
		`,
		fragmentShader: /* glsl */ `
			uniform vec3 uColor;
			uniform vec3 uRim;
			uniform vec3 uFlashColor;
			uniform float uOpacity;
			uniform float uFlash;
			varying vec3 vNormal;
			varying vec3 vView;
			void main() {
				float facing = abs(dot(normalize(vNormal), normalize(vView)));
				float fresnel = pow(1.0 - facing, 2.2);
				vec3 color = mix(uColor, uRim, fresnel) + uFlashColor * uFlash * (0.25 + fresnel);
				float alpha = (0.07 + fresnel * 0.6 + uFlash * 0.12) * uOpacity;
				gl_FragColor = vec4(color, alpha);
			}
		`,
		transparent: true,
		depthWrite: false,
		side: THREE.DoubleSide,
	});
}

let glowTexture = null;

/** Soft radial sprite used for glows and dust. */
export function getGlowTexture() {
	if (glowTexture) return glowTexture;
	const size = 128;
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = size;
	const ctx = canvas.getContext("2d");
	const g = ctx.createRadialGradient(
		size / 2,
		size / 2,
		0,
		size / 2,
		size / 2,
		size / 2,
	);
	g.addColorStop(0, "rgba(255,255,255,1)");
	g.addColorStop(0.25, "rgba(255,255,255,0.55)");
	g.addColorStop(1, "rgba(255,255,255,0)");
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, size, size);
	glowTexture = new THREE.CanvasTexture(canvas);
	glowTexture.colorSpace = THREE.SRGBColorSpace;
	return glowTexture;
}

/**
 * Additive glow sprite.
 * @param {string|number} color
 * @param {number} scale
 */
export function createGlowSprite(color, scale = 1) {
	const sprite = new THREE.Sprite(
		new THREE.SpriteMaterial({
			map: getGlowTexture(),
			color: new THREE.Color(color),
			transparent: true,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
		}),
	);
	sprite.scale.setScalar(scale);
	return sprite;
}
