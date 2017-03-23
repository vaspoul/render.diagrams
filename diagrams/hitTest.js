function HitTest(docTag)
{
	var canvas;
	var camera;
	var bounceCountSlider;
	var roughnessSlider;
	var f0Slider;
	var rayThresholdSlider;
	var startPos = {x:0, y:0};
	var targetPos = {x:-0.1, y:-0.5};
	
	function setup()
	{
		var root = document.getElementById(docTag);
		
		canvas = document.createElement('canvas');
		canvas.width  = 700;
		canvas.height = 700;
		canvas.style.border   = "2px solid black";
		canvas.style.marginLeft = "auto";
		canvas.style.marginRight = "auto";
		canvas.style.display = "block";
		canvas.addEventListener('mousemove', onMouseMove, false);
		canvas.addEventListener('mousedown', onMouseDown, false);
		
		bounceCountSlider = new Slider(root, "Bounce Count", 0, 20, 2, 1, draw);
		roughnessSlider = new Slider(root, "Roughness", 0, 1, 0.5, 0.1, draw);
		f0Slider = new Slider(root, "F0", 0, 1, 0.04, 0.01, draw);
		//rayThresholdSlider = new Slider(root, "Ray Threshold", 0, 5, 0.1, 0.1, draw);
	
		root.appendChild(canvas);
		root.appendChild(bounceCountSlider);
		root.appendChild(roughnessSlider);
		root.appendChild(f0Slider);
		//root.appendChild(rayThresholdSlider);

		camera = new Camera(canvas);
		camera.setUnitScale(Math.min(canvas.width, canvas.height)/2);
	}
	
	function onMouseMove(evt)
	{
		if (evt.buttons & 1)
		{
			targetPos = camera.getMousePos(evt);
			draw();			
		}
		
		if (evt.buttons & 2)
		{
			startPos = camera.getMousePos(evt);
			draw();			
		}
	}

	function onMouseDown(evt)
	{
		if (evt.buttons & 1)
		{
			targetPos = camera.getMousePos(evt);
			draw();			
		}
		
		if (evt.buttons & 2)
		{
			startPos = camera.getMousePos(evt);
			draw();			
		}
	}
	
	function Phong(F0,N,V,L,M)
	{
		var H = add(V,L).unit();
		var NdotL = Math.max(0, dot(N,L));
		var NdotH = dot(N,H);
		var NdotV = dot(N,V);
		var VdotH = dot(V,H);
		var LdotH = dot(L,H);

		var NdotV = dot(V,N);
		var RV = reflect(V.neg(),N);

		var RVdotL = dot(RV,L);
		var RdotV = Math.max(0,RVdotL);
		
		var F = 1;
		var D = 1;
		var G = 1;

		// F, Schlick
		{
			F = F0 + (1.0 - F0) * Math.pow(1.0 - Math.abs(LdotH), 5);
		}

		// D, Phong
		{
			var phongExponent = Math.pow(2, 11 * (1-M));
			var energyConservationFactor = ((phongExponent + 2) / (2 * Math.PI));
	
			D = energyConservationFactor * Math.pow(RdotV, phongExponent);
		}

		// G, Implicit
		{
			G = 4 * NdotL * NdotV;
		}

		//F = 1;
		//D = 1;
		//G = 1;

		var f = F*D*G / (Math.max(0.00001, 4 * NdotL * NdotV));

		f *= NdotL;

		return f;
	}

	function draw()
	{
		camera.clear();
	
		var walls = 
		[
			{pointA:new Vector(-1,-1), pointB:new Vector(+1,-1)},
			{pointA:new Vector(+1,-1), pointB:new Vector(+1,+1)},
			{pointA:new Vector(+1,+1), pointB:new Vector(-1,+1)},
			{pointA:new Vector(-1,+1), pointB:new Vector(-1,-1)},
			{pointA:new Vector(+0,-1), pointB:new Vector(+1,-0)}
		];
		
		for (var w=0; w<walls.length; ++w)
		{
			var wall = walls[w];
			
			camera.drawLine(wall.pointA, wall.pointB, "#000000", 4);
		}
		
		var rays = [ {start:new Vector(startPos.x,startPos.y,0), dir:new Vector(targetPos.x-startPos.x,targetPos.y-startPos.y,0)} ];
		
		var BRDF = Phong;
		var F0 = f0Slider.currentValue;
		var roughness = roughnessSlider.currentValue;
		
		for (var r=0; r<rays.length; ++r)
		{
			var ray = rays[r];
			
			var bestHit = {tRay:1000};
			
			for (var w=0; w<walls.length; ++w)
			{
				var hit = intersectRayLine(ray.start, ray.dir, walls[w].pointA, walls[w].pointB);
				
				if (hit.hit && hit.tRay<bestHit.tRay)
				{
					bestHit = hit;
				}
			}

			if (bestHit.tRay<1000)
			{
				camera.drawLine(ray.start, bestHit.P, "#000000", 2, [5,5]);
				//camera.drawArrow(ray.start, mad(ray.dir, 0.3, ray.start), "#00FF00", 3);
				camera.drawBRDFGraph(BRDF, ray.dir.unit().neg(), bestHit.N, F0, roughness, bestHit.P);
				
				var RV = reflect(ray.dir, bestHit.N);
				var RVAngle = toAngle(RV) / Math.PI * 180;
				
				/*
				// spawn reflected rays
				for (var ang1 = 0; ang1 <= +180; ang1 += 1)
				{
					var ang = RVAngle + ang1;
					
					var Li = new Vector(Math.cos(ang * Math.PI / 180), Math.sin(ang * Math.PI / 180), 0);

					var brdf = BRDF(F0,bestHit.N,ray.dir.unit().negative(),Li,roughness);

					if (brdf>=rayThresholdSlider.currentValue)
					{
						var newRay = { start:0, dir:0 };
						newRay.start = bestHit.P;
						newRay.dir = Li;
						rays.push(newRay);						
					}
					
					if (ang1>0)
					{
						var ang = RVAngle - ang1;
						
						var Li = new Vector(Math.cos(ang * Math.PI / 180), Math.sin(ang * Math.PI / 180), 0);

						var brdf = BRDF(F0,bestHit.N,ray.dir.unit().negative(),Li,roughness);

						if (brdf>=rayThresholdSlider.currentValue)
						{
							var newRay = { start:0, dir:0 };
							newRay.start = bestHit.P;
							newRay.dir = Li;
							rays.push(newRay);						
						}
					}
				}
				*/
				
				var newRay = { start:0, dir:0 };
				newRay.start = bestHit.P;
				newRay.dir = reflect(ray.dir, bestHit.N);
				rays.push(newRay);
			}
			
			if (rays.length>bounceCountSlider.currentValue+1)
			{
				break;
			}
		}
		
		camera.drawLight(startPos, 0.04);
	}
	
	setup();
	draw();
}
