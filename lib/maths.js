function Vector(x,y)
{
  this.x = x || 0;
  this.y = y || 0;
}

var EPSILON = 0.00001;

Vector.prototype.copy = function()
{
	return new Vector(this.x, this.y);
}

Vector.prototype.neg = function() 
{
	return new Vector(-this.x, -this.y);
}

Vector.prototype.unit = function() 
{
	var L = Math.sqrt(this.x*this.x + this.y*this.y);
	return new Vector(this.x/L, this.y/L);
}

Vector.prototype.norm = function() 
{
	var L = Math.sqrt(this.x*this.x + this.y*this.y);
	return new Vector(this.x/L, this.y/L);
}

Vector.prototype.length = function() 
{
	return Math.sqrt(this.x*this.x + this.y*this.y);
}

Vector.prototype.lengthSqr = function() 
{
	return (this.x*this.x + this.y*this.y);
}

function add(a,b) 
{
	if (typeof(a) === "object")
	{
		if (typeof(b) === "object")
		{
			return new Vector(a.x + b.x, a.y + b.y);
		}
		else
		{
			return new Vector(a.x + b, a.y + b);
		}
	}
	else
	{
		if (typeof(b) === "object")
		{
			return new Vector(a + b.x, a + b.y);
		}
		else
		{
			return (a + b);
		}
	}
}

function addv()
{
	if (arguments.length==0)
		return 0;
	else if (arguments.length==1)
		return arguments[0];

	var result = arguments[0];

	for (var i=1; i!=arguments.length; ++i)
	{
		result = add(result, arguments[i]);
	}

	return result;
}

function sub(a,b) 
{
	if (typeof(a) === "object")
	{
		if (typeof(b) === "object")
		{
			return new Vector(a.x - b.x, a.y - b.y);
		}
		else
		{
			return new Vector(a.x - b, a.y - b);
		}
	}
	else
	{
		if (typeof(b) === "object")
		{
			return new Vector(a - b.x, a - b.y);
		}
		else
		{
			return (a - b);
		}
	}
}

function mul(a,b) 
{
	if (typeof(a) === "object")
	{
		if (typeof(b) === "object")
		{
			return new Vector(a.x * b.x, a.y * b.y);
		}
		else
		{
			return new Vector(a.x * b, a.y * b);
		}
	}
	else
	{
		if (typeof(b) === "object")
		{
			return new Vector(a * b.x, a * b.y);
		}
		else
		{
			return (a * b);
		}
	}
}

function div(a,b) 
{
	if (typeof(a) === "object")
	{
		if (typeof(b) === "object")
		{
			return new Vector(a.x / b.x, a.y / b.y);
		}
		else
		{
			return new Vector(a.x / b, a.y / b);
		}
	}
	else
	{
		if (typeof(b) === "object")
		{
			return new Vector(a / b.x, a / b.y);
		}
		else
		{
			return (a / b);
		}
	}
}

function dot(a,b) 
{
	if ( !(typeof(a) === "object") || !(typeof(b) === "object") )
		return;

	return (a.x * b.x + a.y * b.y);
}

function cross(a,b)
{
	if ( !(typeof(a) === "object") || !(typeof(b) === "object") )
		return;

	return a.x * b.y - b.x * a.x;
}

function min(a,b) 
{
	if (typeof(a) === "object")
	{
		if (typeof(b) === "object")
		{
			return new Vector(Math.min(a.x, b.x), Math.min(a.y, b.y));
		}
		else
		{
			return new Vector(Math.min(a.x, b), Math.min(a.y, b));
		}
	}
	else
	{
		if (typeof(b) === "object")
		{
			return new Vector(Math.min(a, b.x), Math.min(a, b.y));
		}
		else
		{
			return Math.min(a, b);
		}
	}
}

function max(a, b)
{
	if (typeof(a) === "object")
	{
		if (typeof(b) === "object")
		{
			return new Vector(Math.max(a.x, b.x), Math.max(a.y, b.y));
		}
		else
		{
			return new Vector(Math.max(a.x, b), Math.max(a.y, b));
		}
	}
	else
	{
		if (typeof(b) === "object")
		{
			return new Vector(Math.max(a, b.x), Math.max(a, b.y));
		}
		else
		{
			return Math.max(a, b);
		}
	}
}

function clamp(v, lower, upper)
{
	return min(max(v, lower), upper);
}

function saturate(v)
{
	return min(max(v, 0), 1);
}

function avg(a, b)
{
	if ( !(typeof(a) === "object") || !(typeof(b) === "object") )
		return;

	return mul(add(a,b), 0.5);
}

function quantize(v, q)
{
	return mul(floor(div(v, q)), q);
}

function distance(a, b)
{
	if ( !(typeof(a) === "object") || !(typeof(b) === "object") )
		return;

	return sub(a,b).length();
}

function distanceSqr(a, b)
{
	if ( !(typeof(a) === "object") || !(typeof(b) === "object") )
		return;

	return sub(a,b).lengthSqr();
}

function equal(a, b)
{
	if (typeof(a) === "object")
	{
		if (typeof(b) === "object")
		{
			return (a.x == b.x) && (a.y == b.y);
		}
		else
		{
			return (a.x == b) && (a.y == b);
		}
	}
	else
	{
		if (typeof(b) === "object")
		{
			return (a == b.x) && (a == b.y);
		}
		else
		{
			return (a == b);
		}
	}

	return false;
}

function length(v)
{
	if ( !(typeof(v) === "object") )
		return;

	return Math.sqrt(dot(v,v));
}

function lengthSqr(v)
{
	if ( !(typeof(v) === "object") )
		return;

	return dot(v,v);
}

function normalize(v)
{
	if ( !(typeof(v) === "object") )
		return;

	return div(v, length(v));
}

function reflect(v,n)
{
	if ( !(typeof(v) === "object") || !(typeof(n) === "object") )
		return;
	
	n = normalize(n);
	
	return sub(v, mul(n, dot(v,n) * 2));
}

function transpose(v)
{
	if ( !(typeof(v) === "object") )
		return;

	return new Vector(v.y, -v.x);
}

function toAngle(v)
{
	if ( !(typeof(v) === "object") )
		return;

	var a = Math.atan2(v.y, v.x);

	//if (a<0)
	//	a += Math.PI*2;

	return a;
}

function fromAngle(a)
{
	return new Vector(Math.cos(a), Math.sin(a));
}

function toDegrees(v)
{
	if (typeof(v) === "object")
	{
		return new mul(v, 180.0 / Math.PI);
	}
	else
	{
		return v * 180.0 / Math.PI;
	}
}

function toRadians(v)
{
	if (typeof(v) === "object")
	{
		return new mul(v, Math.PI / 180.0);
	}
	else
	{
		return v * Math.PI / 180.0;
	}
}

function InsideAngleRange(testAngle, startAngle, endAngle)
{
	if (startAngle < endAngle)
		return testAngle >= startAngle && testAngle <= endAngle;
	else
		return testAngle >= startAngle || testAngle <= endAngle;
}

function IsClosedLoop(startAngle, endAngle)
{
	return (startAngle == endAngle) || (Math.abs(this.endAngle - this.startAngle) == Math.PI*2);
}

function mad(v, s, b)
{
	return add(mul(v,s),b);
}

function lerp(a, b, t)
{
	return mad(sub(b,a), t, a);
}

function floor(v)
{
	if ( !(typeof(v) === "object") )
		return;

	return new Vector(Math.floor(v.x), Math.floor(v.y));
}

function ceil(v)
{
	if ( !(typeof(v) === "object") )
		return;

	return new Vector(Math.ceil(v.x), Math.ceil(v.y));
}

function round(v)
{
	if ( !(typeof(v) === "object") )
		return;

	return new Vector(Math.round(v.x), Math.round(v.y));
}

function abs(v)
{
	if ( !(typeof(v) === "object") )
		return Math.abs(v);

	return new Vector(Math.abs(v.x), Math.abs(v.y));
}

function rotate(v,a)
{
	if ( !(typeof(v) === "object") )
		return;

	var xAxis = new Vector(Math.cos(a), Math.sin(a));
	var yAxis = transpose(xAxis).neg();

	return add( mul(xAxis, v.x), mul(yAxis, v.y) );
}

function lineClosestPoint(point, pointA, pointB)
{
	var lineV = sub(pointB, pointA);
	var lineLength = length(lineV);
	var lineDir = div(lineV, lineLength);

	var AP = sub(point, pointA);

	var projLength = dot(AP, lineDir);

	projLength = Math.max(0, Math.min(lineLength, projLength));

	return mad(projLength, lineDir, pointA);
}

function intersectRayLine(rayStart, rayDir, pointA, pointB, rayRadius)
{
	if (rayRadius == undefined || rayRadius<0)
		rayRadius = 0;

	var lineV = sub(pointB, pointA);
	var lineLength = length(lineV);
	var lineDir = div(lineV, lineLength);
	var lineNorm = transpose(lineDir).neg();
	
	var result = {N:lineNorm, P:rayStart, hit:false, tRay:0, tLine:0};
		
	if (Math.abs(dot(rayDir.unit(), lineDir)) >= (1 - EPSILON))
		return result;

	var height = dot(sub(rayStart, pointA), lineNorm) - rayRadius;
	
	var tRay = height / (-dot(rayDir, lineNorm));

	// don't allow impacts behind the ray start...but make some allowance for rays with a radius 
	// (this helps with resting bouncing balls)
	if ( tRay<-rayRadius)
		return result;

	var I = add(rayStart, mul(rayDir, tRay));
	
	if (rayRadius>0)
	{
		I = add(I, mul(lineNorm, -rayRadius));
	}

	var tLine = dot(sub(I, pointA), lineDir) / lineLength;
	
	if ( ( (tLine - EPSILON) > 1) || ( (tLine + EPSILON) < 0) )
		return result;
	
	result.hit = true;
	result.tLine = tLine;
	result.tRay = tRay;
	result.P = I;
	
	return result;
}

function intersectRayPoint(rayStart, rayDir, pointPos)
{
	var result = {P:rayStart, hit:false, tRay:0};

	var tRay = dot( sub(pointPos, rayStart), rayDir);
	
	if ( tRay<0 )
		return result;

	var I = mad(rayDir, tRay, rayStart);
	
	if (distance(I, pointPos) > EPSILON)
		return result;
	
	result.hit = true;
	result.tRay = tRay;
	result.P = I;
	
	return result;
}

function intersectRayRay(rayStart, rayDir, otherRayStart, otherRayDir, allowNegativeTRay)
{
	if (allowNegativeTRay == undefined)
		allowNegativeTRay = false;

	var lineNorm = transpose(otherRayDir).neg();
	
	var result = {N:lineNorm, P:rayStart, hit:false, tRay:0, tLine:0};

	if (Math.abs(dot(rayDir.unit(), otherRayDir)) >= (1-EPSILON))
		return result;
		
	L = dot( sub(rayStart, otherRayStart), lineNorm);
	
	var tRay = L / (-dot(rayDir, lineNorm));

	if ( tRay<0 && !allowNegativeTRay )
		return result;

	var I = add(rayStart, mul(rayDir, tRay));
	
	var tLine = dot(sub(I, otherRayStart), otherRayDir);
	
	result.hit = true;
	result.tLine = tLine;
	result.tRay = tRay;
	result.P = I;
	
	return result;
}

function intersectRayArc(rayStart, rayDir, arcCenter, arcRadius, arcStartAngle, arcEndAngle)
{
	var result = {P:rayStart, hit:false, tRay:0};

	if (arcStartAngle == undefined)
		arcStartAngle = 0;

	if (arcEndAngle == undefined)
		arcEndAngle = Math.PI * 2;

	var startAngle = arcStartAngle * 180 / Math.PI;
	var endAngle = arcEndAngle * 180 / Math.PI;

	var RO = sub(arcCenter, rayStart);

	// If ray starts on the arc, assume no hit
	if (Math.abs(length(RO) - arcRadius) <= EPSILON)
	{
		if ((endAngle - startAngle + 360) % 360 == 0)
		{
			return result;
		}
		else
		{
			var angleRayStart = toAngle(sub(rayStart, arcCenter))

			angleRayStart *= 180 / Math.PI;

			var valid = (angleRayStart - startAngle + 360) % 360 >= 0 && (angleRayStart - startAngle + 360) % 360 <= (endAngle - startAngle + 360) % 360;

			if (valid)
				return result;
		}
	}

	var perpDist = Math.abs(dot(RO, transpose(rayDir)));

	// Check if ray is too far from the center
	if (perpDist > arcRadius)
		return result;

	// Distance of arc center along ray. 
	var distanceToArcCenter = dot(RO, rayDir);

	// Ray starts beyond the arc
	if (distanceToArcCenter < -arcRadius)
		return result;

	// How far do we need to backtrack along the ray such that the distance between the point 
	// on the ray and the center is equal to arc radius?
	var delta = Math.sqrt(arcRadius*arcRadius - perpDist*perpDist);

	var distanceToImpactNear = distanceToArcCenter - delta;
	var distanceToImpactFar = distanceToArcCenter + delta;

	var PNear = add(rayStart, mul(rayDir, distanceToImpactNear));
	var PFar = add(rayStart, mul(rayDir, distanceToImpactFar));

	// check if impact point is outside the (stand,end) angle range
	var angleNear = toAngle(sub(PNear, arcCenter))
	var angleFar = toAngle(sub(PFar, arcCenter))

	angleNear *= 180 / Math.PI;
	angleFar *= 180 / Math.PI;

	var nearValid = (distanceToImpactNear>=EPSILON) && (angleNear - startAngle + 360) % 360 >= 0 && (angleNear - startAngle + 360) % 360 <= (endAngle - startAngle + 360) % 360;
	var farValid = (distanceToImpactFar>=EPSILON) && (angleFar - startAngle + 360) % 360 >= 0 && (angleFar - startAngle + 360) % 360 <= (endAngle - startAngle + 360) % 360;

	if ((endAngle - startAngle + 360) % 360 == 0)
	{
		nearValid = true;
		farValid = true;
	}

	// If ray starts outside the arc, accept near impact
	if (distance(rayStart, arcCenter) > arcRadius && nearValid)
	{
		result.hit = true;
		result.tRay = distanceToImpactNear;
		result.P = PNear;
	}
	else if (farValid)
	{
		result.hit = true;
		result.tRay = distanceToImpactFar;
		result.P = PFar;
	}

	return result;
}

function overlapRayRect(rayStart, rayDir, rectMin, rectMax, rayRadius)
{
	if (rayRadius == undefined || rayRadius<0)
		rayRadius = 0;
	
	rayDir = rayDir.unit();
	var tan = transpose(rayDir);
	var absTan = abs(tan);

	var rectCenter = avg(rectMin, rectMax);
	var rectSize = mul(sub(rectMax, rectMin), 0.5);

	var rectRadius = dot(rectSize, absTan);

	var rectDist = Math.abs(dot(sub(rectCenter, rayStart), tan));

	return (rectDist - rectRadius) <= EPSILON;
}

function overlapRectPoint(rectMin, rectMax, p)
{
	return	rectMax.x >= p.x &&
			rectMin.x <= p.x &&
			rectMax.y >= p.y &&
			rectMin.y <= p.y;
}

function overlapRectLine(rectMin, rectMax, lineA, lineB)
{
	var L = sub(lineB, lineA);
	var l = L.length();
	L  = div(L, l);
	var C = avg(rectMin, rectMax);
	var AC = sub(C, lineA);
	var d = dot(AC, L);

	d = Math.max(0, Math.min(l, d));

	var p = add(lineA, mul(L, d));

	if (	p.x < Math.min(rectMin.x, rectMax.x) ||
			p.y < Math.min(rectMin.y, rectMax.y) ||
			p.x > Math.max(rectMin.x, rectMax.x) ||
			p.y > Math.max(rectMin.y, rectMax.y) )
	{
		return false;
	}
		
	return true;
}

function overlapRectLineStrip(rectMin, rectMax, points, closed)
{
	if (points.length<2)
		return false;

	for (var i = 0; i != points.length-1; ++i)
	{
		if (overlapRectLine(rectMin, rectMax, points[i], points[i+1]))
			return true;
	}

	if (closed)
	{
		if (overlapRectLine(rectMin, rectMax, points[points.length-1], points[0]))
			return true;
	}

	return false;
}

function EvalBezier(bezierControlPoints, t)
{
	function B0(t)		{ var tmp = 1.0 - t;		return (tmp * tmp * tmp);		}
	function B1(t)		{ var tmp = 1.0 - t;		return (3 * t * (tmp * tmp));	}
	function B2(t)		{ var tmp = 1.0 - t;		return (3 * t * t * tmp);		}
	function B3(t)		{							return (t * t * t);				}

	return mad( bezierControlPoints[0], B0(t), mad( bezierControlPoints[1], B1(t), mad( bezierControlPoints[2], B2(t), mul( bezierControlPoints[3], B3(t) ) ) ) );
}

function overlapRectBezier(rectMin, rectMax, bezierControlPoints)
{
	if (	overlapRectPoint(rectMin, rectMax, bezierControlPoints[0]) ||
			overlapRectPoint(rectMin, rectMax, bezierControlPoints[3]) )
	{
		return true;
	}

	var rectSize = distance(rectMin, rectMax);
	var bezierRectMin = min(bezierControlPoints[0], min(bezierControlPoints[1], min(bezierControlPoints[2], bezierControlPoints[3])));
	var bezierRectMax = max(bezierControlPoints[0], max(bezierControlPoints[1], max(bezierControlPoints[2], bezierControlPoints[3])));
	var bezierSize = distance(bezierRectMax, bezierRectMin);
	
	var count = Math.min(128, Math.max(16, Math.ceil(bezierSize / rectSize)));
	var step = 1.0 / count;
	var t = 0;

	for (var i=0; i!=count; ++i)
	{
		if (overlapRectPoint(rectMin, rectMax, EvalBezier(bezierControlPoints, t)))
			return true;

		t += step;
	}

	return false;
}

function overlapRectArc(rectMin, rectMax, arcCenter, arcRadius, arcStartAngle, arcEndAngle)
{
	if (arcStartAngle == undefined)
		arcStartAngle = 0;

	if (arcEndAngle == undefined)
		arcEndAngle = Math.PI * 2;

	var rectCenter = avg(rectMin, rectMax);

	var p = mad(sub(rectCenter, arcCenter).unit(), arcRadius, arcCenter);

	if (	p.x>rectMax.x ||
			p.x<rectMin.x ||
			p.y>rectMax.y ||
			p.y < rectMin.y)
	{
		return false;
	}
	
	arcStartAngle = toDegrees(arcStartAngle);
	arcEndAngle = toDegrees(arcEndAngle);

	if ((arcEndAngle - arcStartAngle + 360) % 360 == 0)
		return true;

	var a = [	toDegrees( toAngle(sub(new Vector(rectMin.x, rectMin.y), arcCenter)) ),
				toDegrees( toAngle(sub(new Vector(rectMin.x, rectMax.y), arcCenter)) ),
				toDegrees( toAngle(sub(new Vector(rectMax.x, rectMin.y), arcCenter)) ),
				toDegrees( toAngle(sub(new Vector(rectMax.x, rectMax.y), arcCenter)) ) ];

	for (var i=0; i!=4; ++i)
	{
		if ( (a[i] - arcStartAngle + 360) % 360 >= 0 && (a[i] - arcStartAngle + 360) % 360 <= (arcEndAngle - arcStartAngle + 360) % 360 )
			return true;
	}		

	return false;
}

function overlapRectOBB(rectMin, rectMax, obbPoints)
{
	if (obbPoints[0].x < rectMin.x && obbPoints[1].x < rectMin.x && obbPoints[2].x < rectMin.x && obbPoints[3].x < rectMin.x)
		return false;

	if (obbPoints[0].x > rectMax.x && obbPoints[1].x > rectMax.x && obbPoints[2].x > rectMax.x && obbPoints[3].x > rectMax.x)
		return false;

	if (obbPoints[0].y < rectMin.y && obbPoints[1].y < rectMin.y && obbPoints[2].y < rectMin.y && obbPoints[3].y < rectMin.y)
		return false;

	if (obbPoints[0].y > rectMax.y && obbPoints[1].y > rectMax.y && obbPoints[2].y > rectMax.y && obbPoints[3].y > rectMax.y)
		return false;

	var axis1 = sub(obbPoints[1], obbPoints[0]);
	var length1 = axis1.length();
	axis1 = div(axis1, length1);

	var aabbPoints = [	sub(new Vector(rectMin.x, rectMin.y), obbPoints[0]),
						sub(new Vector(rectMin.x, rectMax.y), obbPoints[0]),
						sub(new Vector(rectMax.x, rectMax.y), obbPoints[0]),
						sub(new Vector(rectMax.x, rectMin.y), obbPoints[0]) ];

	var dots1 = [	dot(aabbPoints[0], axis1),
					dot(aabbPoints[1], axis1),
					dot(aabbPoints[2], axis1),
					dot(aabbPoints[3], axis1) ];

	if (dots1[0]<0 && dots1[1]<0 && dots1[2]<0 && dots1[3]<0)
		return false;

	if (dots1[0]>length1 && dots1[1]>length1 && dots1[2]>length1 && dots1[3]>length1)
		return false;


	var axis2 = sub(obbPoints[3], obbPoints[0]);
	var length2 = axis2.length();
	axis2 = div(axis2, length2);

	var dots2 = [	dot(aabbPoints[0], axis2),
					dot(aabbPoints[1], axis2),
					dot(aabbPoints[2], axis2),
					dot(aabbPoints[3], axis2) ];

	if (dots2[0]<0 && dots2[1]<0 && dots2[2]<0 && dots2[3]<0)
		return false;

	if (dots2[0]>length2 && dots2[1]>length2 && dots2[2]>length2 && dots2[3]>length2)
		return false;

	return true;
}

function clipLineToRect(rectMin, rectMax, p0, p1)
{
	function clip(rectMin, rectMax, p0, p1)
	{
		var pDelta = sub(p1, p0);
		var pDir = pDelta.unit();

		var limitMax = new Vector( pDir.x>0 ? rectMax.x : rectMin.x, pDir.y>0 ? rectMax.y : rectMin.y);

		var distMax = sub(limitMax, p0);

		var distRatio = div(distMax, pDelta);

		if (Math.abs(pDelta.x) < EPSILON)
			distRatio.x = 1000;

		if (Math.abs(pDelta.y) < EPSILON)
			distRatio.y = 1000;

		var clipped1 = p1;

		if (distRatio.x <= 0 || distRatio.y <= 0)
			return [];

		if (distRatio.x < distRatio.y && distRatio.x < 1)
		{
			clipped1 = mad(pDir, distMax.x / pDir.x, p0);
		}
		else if (distRatio.y < distRatio.x && distRatio.y < 1)
		{
			clipped1 = mad(pDir, distMax.y / pDir.y, p0);
		}

		return [p0, clipped1];
	}

	var clipped = clip(rectMin, rectMax, p1, p0);

	if (clipped.length)
		clipped = clip(rectMin, rectMax, clipped[1], clipped[0]);

	return clipped;
}

// https://codepen.io/pen?editors=0110
function wavelengthToColor(wavelength)
{
    var Gamma = 0.80;
    var IntensityMax = 255;
    var factor, red, green, blue;

    if ((wavelength >= 380) && (wavelength<440))
	{
        red = -(wavelength - 440) / (440 - 380);
        green = 0.0;
        blue = 1.0;
    }
	else if ((wavelength >= 440) && (wavelength<490))
	{
        red = 0.0;
        green = (wavelength - 440) / (490 - 440);
        blue = 1.0;
    }
	else if ((wavelength >= 490) && (wavelength<510))
	{
        red = 0.0;
        green = 1.0;
        blue = -(wavelength - 510) / (510 - 490);
    }
	else if ((wavelength >= 510) && (wavelength<580))
	{
        red = (wavelength - 510) / (580 - 510);
        green = 1.0;
        blue = 0.0;
    }
	else if ((wavelength >= 580) && (wavelength<645))
	{
        red = 1.0;
        green = -(wavelength - 645) / (645 - 580);
        blue = 0.0;
    }
	else if ((wavelength >= 645) && (wavelength<781))
	{
        red = 1.0;
        green = 0.0;
        blue = 0.0;
    }
	else
	{
        red = 0.0;
        green = 0.0;
        blue = 0.0;
    };
	
	// Let the intensity fall off near the vision limits
    if ((wavelength >= 380) && (wavelength<420))
	{
        factor = 0.3 + 0.7*(wavelength - 380) / (420 - 380);
    }
	else if ((wavelength >= 420) && (wavelength<701))
	{
        factor = 1.0;
    }
	else if ((wavelength >= 701) && (wavelength<781))
	{
        factor = 0.3 + 0.7*(780 - wavelength) / (780 - 700);
    }
	else
	{
        factor = 0.0;
    }

    if (red !== 0)
	{
        red = Math.round(IntensityMax * Math.pow(red * factor, Gamma));
    }
    
	if (green !== 0)
	{
        green = Math.round(IntensityMax * Math.pow(green * factor, Gamma));
    }

    if (blue !== 0)
	{
        blue = Math.round(IntensityMax * Math.pow(blue * factor, Gamma));
    }

    return [red,green,blue, "rgb(" + red.toFixed(0) + ", " + green.toFixed(0) + ", " + blue.toFixed(0) + ")"];
}

var pseudoRandom = {};

(function()
{
	pseudoRandom.seed = 0;

	pseudoRandom.setSeed = function(seed)
	{
		pseudoRandom.seed = seed;
	}

	pseudoRandom.random = function(seed)
	{
		if (seed !== undefined)
		{
			pseudoRandom.seed = seed;
		}

		var x = Math.sin(pseudoRandom.seed++) * 10000;
		return x - Math.floor(x);
	}

})();

// https://www.realtimerendering.com/resources/GraphicsGems/gems/FitCurves.c
// An Algorithm for Automatically Fitting Digitized Curves by Philip J. Schneider from "Graphics Gems", Academic Press, 1990
function fitBezierCurve(points, errorThreshold)
{
	if (errorThreshold == undefined)
		errorThreshold = 2;

	if (points.length <= 2)
	{
		return [ [points[0], avg(points[0], points[1]), avg(points[0], points[1]), points[1]] ];
	}

	// Calculate t (normalised length along curve) for each point
	function ChordLengthParameterize(indexFirst, indexLast)
	{
		points[indexFirst].t = 0;

		// Calculate cumulative distance between points
		for (var i=indexFirst+1; i <=indexLast; ++i)
		{
			points[i].t = points[i-1].t + distance(points[i], points[i-1]);
		}

		// Normalize
		var invTotalLength = 1.0 / points[indexLast].t;

		for (var i=indexFirst; i <=indexLast; ++i)
		{
			points[i].t = points[i].t * invTotalLength;
		}
	};

	// Bezier multipliers, B0, B1, B2, B3
	function B0(u)		{ var tmp = 1.0 - u;		return (tmp * tmp * tmp);		}
	function B1(u)		{ var tmp = 1.0 - u;		return (3 * u * (tmp * tmp));	}
	function B2(u)		{ var tmp = 1.0 - u;		return (3 * u * u * tmp);		}
	function B3(u)		{							return (u * u * u);				}

	function ComputeLeftTangent(i)
	{
		return sub(points[i+1], points[i]).unit();
	}

	function ComputeRightTangent(i)
	{
		return sub(points[i-1], points[i]).unit();
	}

	function ComputeCenterTangent(i)
	{
		return avg( sub(points[i-1], points[i]).unit(), sub(points[i], points[i+1]).unit() ).unit();
	}

	function EvalBezier(degree, controlPoints, t)
	{
		var temp = new Array(degree+1);		/* Local copy of control points		*/

		for (var i = 0; i <= degree; ++i) 
		{
			temp[i] = controlPoints[i].copy();
		}

		// Triangle computation
		for (i = 1; i <= degree; i++) 
		{	
			for (j = 0; j <= degree-i; j++) 
			{
				temp[j] = lerp(temp[j], temp[j+1], t);
			}
		}

		return temp[0].copy();
	}

	function GenerateBezier(indexFirst, indexLast, tangentFirst, tangentLast)
	{
		// First and last control points of the Bezier curve are positioned exactly at the first and last data points
		var bezierPoints = [ points[indexFirst].copy(), undefined, undefined, points[indexLast].copy() ];

		// Compute the A's
		for (var i=indexFirst; i <=indexLast; ++i)
		{
			points[i].A0 = mul(tangentFirst, B1(points[i].t));
			points[i].A1 = mul(tangentLast, B2(points[i].t));
		}

		// Create the C and X matrices
		var C = [ [0,0], [0,0] ];
		var X = [0,0];

		for (var i=indexFirst; i <=indexLast; ++i)
		{
			C[0][0] += dot(points[i].A0, points[i].A0);
			C[0][1] += dot(points[i].A0, points[i].A1);

			C[1][0] = C[0][1];
			C[1][1] += dot(points[i].A1, points[i].A1);

			tmp = sub(points[i], mad(points[indexFirst], B0(points[i].t), mad(points[indexFirst], B1(points[i].t), mad(points[indexLast], B2(points[i].t), mul(points[indexLast], B3(points[i].t))))));

			X[0] += dot(points[i].A0, tmp);
			X[1] += dot(points[i].A1, tmp);
		}

		// Compute the determinants of C and X
		var det_C0_C1 = C[0][0] * C[1][1] - C[1][0] * C[0][1];
		var det_C0_X  = C[0][0] * X[1]    - C[1][0] * X[0];
		var det_X_C1  = X[0]    * C[1][1] - X[1]    * C[0][1];

		// Finally, derive alpha values
		var alphaFirst = (det_C0_C1 == 0) ? 0.0 : det_X_C1 / det_C0_C1;
		var alphaLast = (det_C0_C1 == 0) ? 0.0 : det_C0_X / det_C0_C1;

		// If alpha negative, use the Wu/Barsky heuristic (see text) 
		// if alpha is 0, you get coincident control points that lead to divide by zero in any subsequent NewtonRaphsonRootFind() call.
		var segLength = distance(points[indexFirst], points[indexLast]);
		var epsilon = 1.0e-6 * segLength;

		if (alphaFirst < epsilon || alphaLast < epsilon)
		{
			// fall back on standard (probably inaccurate) formula, and subdivide further if needed.
			var dist = segLength / 3.0;
			alphaFirst = dist;
			alphaLast = dist;
		}

		// Control points 1 and 2 are positioned an alpha distance out on the tangent vectors, left and right, respectively
		bezierPoints[1] = mad( tangentFirst, alphaFirst, bezierPoints[0]);
		bezierPoints[2] = mad( tangentLast, alphaLast, bezierPoints[3]);

		return bezierPoints;
	}

	//  NewtonRaphsonRootFind : Use Newton-Raphson iteration to find better root.
	function NewtonRaphsonRootFind(	bezierPoints,		//  Current fitted curve
									P,					//  Digitized point
									t)					//  Parameter value for P
	{
		var 	Q1 = new Array(3);	//  Q'
		var		Q2 = new Array(2);	//  Q''
		var		Q_u, Q1_u, Q2_u;	// u evaluated at Q, Q', & Q''
    
		// Compute Q(u)
		Q_u = EvalBezier(3, bezierPoints, t);
    
		// Generate control vertices for Q'
		for (var i = 0; i <= 2; ++i)
		{
			Q1[i] = mul(sub(bezierPoints[i+1], bezierPoints[i]), 3);
		}
    
		// Generate control vertices for Q''
		for (var i = 0; i <= 1; i++) 
		{
			Q2[i] = mul(sub(Q1[i+1], Q1[i]), 2);
		}
    
		// Compute Q'(u) and Q''(u)
		Q1_u = EvalBezier(2, Q1, t);
		Q2_u = EvalBezier(1, Q2, t);
    
		// Compute f(u)/f'(u)
		var numerator = (Q_u.x - P.x) * (Q1_u.x) + (Q_u.y - P.y) * (Q1_u.y);
		var denominator = (Q1_u.x) * (Q1_u.x) + (Q1_u.y) * (Q1_u.y) + (Q_u.x - P.x) * (Q2_u.x) + (Q_u.y - P.y) * (Q2_u.y);
		
		if (denominator == 0) 
			return t;

		// u = u - f(u)/f'(u)
		var improved_t = t - (numerator/denominator);

		return improved_t;
	}

	//  Reparameterize: Given set of points and their parameterization, try to find a better parameterization.
	function Reparameterize(indexFirst, indexLast,	bezierCurve)
	{
		for (var i = indexFirst; i <= indexLast; ++i) 
		{
			points[i-indexFirst].t = NewtonRaphsonRootFind(bezierCurve, points[i-indexFirst], points[i-indexFirst].t);
		}
	}


	//  ComputeMaxError : Find the maximum squared distance of digitized points to fitted curve.
	function ComputeMaxError(indexFirst, indexLast, bezierCurve, t)
	{
		var splitPointIndex = indexFirst + Math.floor( (indexLast - indexFirst + 1) / 2 );

		var maxError = 0.0;

		for (i = indexFirst + 1; i < indexLast; i++) 
		{
			var P = EvalBezier(3, bezierCurve, points[i].t);
			
			var error = distanceSqr(P, points[i]);
			
			if (error >= maxError) 
			{
				maxError = error;
				splitPointIndex = i;
			}
		}

		return { error: maxError, errorIndex: splitPointIndex };
	}

	// FitCubic : Fit a Bezier curve to a (sub)set of digitized points
	function FitCubic(indexFirst, indexLast, tangentFirst, tangentLast, errorThresholdSqr)
	{
		var iterationError = errorThresholdSqr * 4.0;	// fixed issue 23
		var pointCount = indexLast - indexFirst + 1;

		//  Use heuristic if region only has two points in it
		if (pointCount == 2)
		{
			var dist = distance(points[indexLast], points[indexFirst]) / 3.0;

			var bezCurve = [0,0,0,0];

			bezCurve[0] = points[indexFirst].copy();
			bezCurve[3] = points[indexLast].copy();

			bezCurve[1] = mad(tangentFirst, dist, bezCurve[0]);
			bezCurve[2] = mad(tangentLast, dist, bezCurve[3]);

			return [ bezCurve ];
		}

		//  Parameterize points, and attempt to fit curve
		ChordLengthParameterize(indexFirst, indexLast);

		var bezCurve = GenerateBezier(indexFirst, indexLast, tangentFirst, tangentLast);

		//  Find max deviation of points to fitted curve
		var maxError = ComputeMaxError(indexFirst, indexLast, bezCurve);

		if (maxError.error < errorThresholdSqr) 
		{
			return [ bezCurve ];
		}


		//  If error not too large, try some reparameterization and iteration
		if (maxError.error < iterationError)
		{
			var kMaxIterations = 20;

			for (var i = 0; i < kMaxIterations; i++) 
			{
				Reparameterize(indexFirst, indexLast, bezCurve);

				bezCurve = GenerateBezier(indexFirst, indexLast, tangentFirst, tangentLast);

				maxError = ComputeMaxError(indexFirst, indexLast, bezCurve);

				if (maxError.error < errorThresholdSqr) 
				{
					return [ bezCurve ];
				}
			}
		}

		// Fitting failed -- split at max error point and fit recursively
		var tangentCenter = ComputeCenterTangent(maxError.errorIndex);

		var leftCurves = FitCubic(indexFirst, maxError.errorIndex, tangentFirst, tangentCenter, errorThresholdSqr);
		var rightCurves = FitCubic(maxError.errorIndex, indexLast, tangentCenter.neg(), tangentLast, errorThresholdSqr);

		var result = [];

		result = result.concat(leftCurves);
		result = result.concat(rightCurves);

		return result;
	}

	// FitCurve : Fit a Bezier curve to a set of digitized points 
	function FitCurve(errorThreshold)
	{
		var tangentFirst = ComputeLeftTangent(0);
		var tangentLast = ComputeRightTangent(points.length-1);
		
		return FitCubic(0, points.length-1, tangentFirst, tangentLast, errorThreshold*errorThreshold );
	}

	return FitCurve(errorThreshold);
}