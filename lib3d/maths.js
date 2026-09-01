function Vector(x,y,z)
{
	if (Array.isArray(x) && y == undefined && z == undefined)
	{
		this.x = x[0] || 0;
		this.y = x[1] || 0;
		this.z = x[2] || 0;
	}
	else
	{
		this.x = x || 0;
		this.y = y || 0;
		this.z = z || 0;
	}
}

Vector.prototype.copy = function()
{
	return new Vector(this.x, this.y, this.z);
}

Vector.prototype.neg = function() 
{
	return new Vector(-this.x, -this.y, -this.z);
}

Vector.prototype.unit = function() 
{
	var L = Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z);
	return new Vector(this.x/L, this.y/L, this.z/L);
}

Vector.prototype.norm = function() 
{
	var L = Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z);
	return new Vector(this.x/L, this.y/L, this.z/L);
}

Vector.prototype.length = function() 
{
	return Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z);
}

Vector.prototype.lengthSqr = function() 
{
	return (this.x*this.x + this.y*this.y + this.z*this.z);
}

function add(a,b) 
{
	if (typeof(a) === "object")
	{
		if (typeof(b) === "object")
		{
			return new Vector(a.x + b.x, a.y + b.y, a.z + b.z);
		}
		else
		{
			return new Vector(a.x + b, a.y + b, a.z + b);
		}
	}
	else
	{
		if (typeof(b) === "object")
		{
			return new Vector(a + b.x, a + b.y, a + b.z);
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
			return new Vector(a.x - b.x, a.y - b.y, a.z - b.z);
		}
		else
		{
			return new Vector(a.x - b, a.y - b, a.z - b);
		}
	}
	else
	{
		if (typeof(b) === "object")
		{
			return new Vector(a - b.x, a - b.y, a - b.z);
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
			return new Vector(a.x * b.x, a.y * b.y, a.z * b.z);
		}
		else
		{
			return new Vector(a.x * b, a.y * b, a.z * b);
		}
	}
	else
	{
		if (typeof(b) === "object")
		{
			return new Vector(a * b.x, a * b.y, a * b.z);
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
			return new Vector(a.x / b.x, a.y / b.y, a.z / b.z);
		}
		else
		{
			return new Vector(a.x / b, a.y / b, a.z / b);
		}
	}
	else
	{
		if (typeof(b) === "object")
		{
			return new Vector(a / b.x, a / b.y, a / b.z);
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

	return (a.x * b.x + a.y * b.y + a.z * b.z);
}

function dot4(a,b) 
{
	return (a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]);
}

function cross(a,b)
{
	if ( !(typeof(a) === "object") || !(typeof(b) === "object") )
		return;

	return	new Vector(	a.y * b.z - a.z * b.y,
						a.z * b.x - a.x * b.z,
						a.x * b.y - a.y * b.x );
}

function min(a,b) 
{
	if (typeof(a) === "object")
	{
		if (typeof(b) === "object")
		{
			return new Vector(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.min(a.z, b.z));
		}
		else
		{
			return new Vector(Math.min(a.x, b), Math.min(a.y, b), Math.min(a.z, b));
		}
	}
	else
	{
		if (typeof(b) === "object")
		{
			return new Vector(Math.min(a, b.x), Math.min(a, b.y), Math.min(a, b.z));
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
			return new Vector(Math.max(a.x, b.x), Math.max(a.y, b.y), Math.max(a.z, b.z));
		}
		else
		{
			return new Vector(Math.max(a.x, b), Math.max(a.y, b), Math.max(a.z, b));
		}
	}
	else
	{
		if (typeof(b) === "object")
		{
			return new Vector(Math.max(a, b.x), Math.max(a, b.y), Math.max(a, b.z));
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
			return (a.x == b.x) && (a.y == b.y) && (a.z == b.z);
		}
		else
		{
			return (a.x == b) && (a.y == b) && (a.z == b);
		}
	}
	else
	{
		if (typeof(b) === "object")
		{
			return (a == b.x) && (a == b.y) && (a == b.z);
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

function mad(v, s, b)
{
	return add(mul(v,s),b);
}

function lerp(a, b, t)
{
	return mad(sub(b,a), t, a);
}

function slerp(v0, v1, t)
{
    var dotProd = dot(v0, v1);

    var theta = Math.acos(dotProd);

    var sinTheta = sin(theta);

    if (sinTheta < 1e-5)
	{
        // Vectors are very close — use linear interpolation
        return normalize(lerp(v0, v1, t));
    }

    var a = sin((1.0 - t) * theta) / sinTheta;
    var b = sin(t * theta) / sinTheta;

    return normalize( mad(v0, a, mul(v1, b)) );
}

function floor(v)
{
	if ( !(typeof(v) === "object") )
		return;

	return new Vector(Math.floor(v.x), Math.floor(v.y), Math.floor(v.z));
}

function ceil(v)
{
	if ( !(typeof(v) === "object") )
		return;

	return new Vector(Math.ceil(v.x), Math.ceil(v.y), Math.ceil(v.z));
}

function round(v)
{
	if ( !(typeof(v) === "object") )
		return;

	return new Vector(Math.round(v.x), Math.round(v.y), Math.round(v.z));
}

function abs(v)
{
	if ( !(typeof(v) === "object") )
		return Math.abs(v);

	return new Vector(Math.abs(v.x), Math.abs(v.y), Math.abs(v.z));
}

function degrees(v)
{
	if ( !(typeof(v) === "object") )
		return v * 180 / Math.PI;

	return new Vector(v.x * 180 / Math.PI, v.y * 180 / Math.PI, v.z * 180 / Math.PI);
}
function radians(v)
{
	if ( !(typeof(v) === "object") )
		return v * Math.PI / 180;

	return new Vector(v.x * Math.PI / 180, v.y * Math.PI / 180, v.z * Math.PI / 180);
}
function sin(v)
{
	if ( !(typeof(v) === "object") )
		return Math.sin(v * Math.PI / 180);

	return new Vector(Math.sin(v.x * Math.PI / 180), Math.sin(v.y * Math.PI / 180), Math.sin(v.z * Math.PI / 180));
}
function cos(v)
{
	if ( !(typeof(v) === "object") )
		return Math.cos(v * Math.PI / 180);

	return new Vector(Math.cos(v.x * Math.PI / 180), Math.cos(v.y * Math.PI / 180), Math.cos(v.z * Math.PI / 180));
}
function sign(v)
{
	if ( !(typeof(v) === "object") )
		return Math.sign(v);

	return new Vector(Math.sign(v.x), Math.sign(v.y), Math.sign(v.z));
}

function sqrt(v)
{
	if ( !(typeof(v) === "object") )
		return Math.sqrt(v);

	return new Vector(Math.sqrt(v.x), Math.sqrt(v.y), Math.sqrt(v.z));
}

function pow(v, x)
{
	if ( !(typeof(v) === "object") )
		return Math.pow(v, x);

	return new Vector(Math.pow(v.x, x), Math.pow(v.y, x), Math.pow(v.z, x));
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
	
	if ( (tLine>1) || (tLine<0) )
		return result;
	
	result.hit = true;
	result.tLine = tLine;
	result.tRay = tRay;
	result.P = I;
	
	return result;
}

function intersectRayRay(rayStart, rayDir, otherRayStart, otherRayDir)
{
	var lineNorm = transpose(otherRayDir).neg();
	
	var result = {N:lineNorm, P:rayStart, hit:false, tRay:0, tLine:0};
		
	L = dot( sub(rayStart, otherRayStart), lineNorm);
	
	var tRay = L / (-dot(rayDir, lineNorm));

	if ( tRay<0 )
		return result;

	var I = add(rayStart, mul(rayDir, tRay));
	
	var tLine = dot(sub(I, otherRayStart), otherRayDir);
	
	result.hit = true;
	result.tLine = tLine;
	result.tRay = tRay;
	result.P = I;
	
	return result;
}

function intersectRayPlane(rayStart, rayDir, planeDir, planePos)
{
	var planeOffset = dot(planeDir, planePos);
	
	var distanceToPlane = dot(rayStart, planeDir) - planeOffset;

	var t = distanceToPlane / -dot(rayDir, planeDir);

	var intersectionPos = mad(rayDir, t, rayStart);

	return intersectionPos;
}

function triangleNormal(p0, p1, p2)
{
	var p01 = sub(p1, p0).unit();
	var p12 = sub(p2, p1).unit();
	var N = cross(p01, p12).unit();

	return N;
}
function pointInsideTriangle(p0, p1, p2, p)
{
	var p01 = sub(p1, p0).unit();
	var p12 = sub(p2, p1).unit();
	var p20 = sub(p0, p2).unit();
	var N = cross(p01, p12).unit();
	var N01 = cross(N, p01).unit();
	var N12 = cross(N, p12).unit();
	var N20 = cross(N, p20).unit();

	var inside01 = dot(sub(p,p0), N01)>=0;
	var inside12 = dot(sub(p,p1), N12)>=0;
	var inside20 = dot(sub(p,p2), N20)>=0;

	return inside01 && inside12 && inside20;
}

function triangleBarycentrics(p0, p1, p2, p)
{
	var p01 = sub(p1, p0);
	var p02 = sub(p2, p0);
	var N = cross(p01, p02);

	var N0 = cross( sub(p1, p), sub(p2, p) );
	var N1 = cross( sub(p0, p), sub(p2, p) );
	var N2 = cross( sub(p1, p), sub(p0, p) );

	var b0 = N0.length() / N.length();
	var b1 = N1.length() / N.length();
	var b2 = N2.length() / N.length();

	return [b0, b1, b2];
}

function quadUV(p00, p10, p11, p01, p)
{
	var uAxis = sub(p10, p00);
	var vAxis = sub(p01, p00);

	var u = dot( sub(p, p00), uAxis ) / uAxis.lengthSqr();
	var v = dot( sub(p, p00), vAxis ) / vAxis.lengthSqr();

	return [u,v];
}

function intersectRayTriangle(rayStart, rayDir, p0, p1, p2, allowHitsFromBehind)
{
	if (allowHitsFromBehind == undefined)
		allowHitsFromBehind = false;

	var p01 = sub(p1, p0).unit();
	var p12 = sub(p2, p1).unit();
	var p20 = sub(p0, p2).unit();
	var N = cross(p01, p12).unit();
	var N01 = cross(N, p01).unit();
	var N12 = cross(N, p12).unit();
	var N20 = cross(N, p20).unit();

	if (dot(N, rayDir) >= 0 && !allowHitsFromBehind)
		return undefined;

	var pointOnPlane = intersectRayPlane(rayStart, rayDir, N, p0);

	var inside01 = dot(sub(pointOnPlane, p0), N01)>=0;
	var inside12 = dot(sub(pointOnPlane, p1), N12)>=0;
	var inside20 = dot(sub(pointOnPlane, p2), N20)>=0;

	if ( inside01 && inside12 && inside20 )
		return pointOnPlane;

	return undefined;
}

function intersectRayTriangleBary(rayStart, rayDir, p0, p1, p2, allowHitsFromBehind)
{
	var hitPoint = intersectRayTriangle(rayStart, rayDir, p0, p1, p2, allowHitsFromBehind);

	if (hitPoint != undefined)
	{
		var baryCoords = triangleBarycentrics(p0, p1, p2, hitPoint);

		return {p:hitPoint, baryCoords:baryCoords};
	}

	return undefined;
}

function interpolateOnTriangle(f0, f1, f2, b0, b1, b2)
{
	return mad(f0, b0, mad(f1, b1, mul(f2, b2)));
}

function interpolateOnQuad(f00, f10, f11, f01, u, v)
{
	return lerp( lerp(f00, f10, u), lerp(f01, f11, u), v);
}

function intersectRayQuad(rayStart, rayDir, p0, p1, p2, p3, allowHitsFromBehind)
{
	if (allowHitsFromBehind == undefined)
		allowHitsFromBehind = false;

	var p01 = sub(p1, p0).unit();
	var p12 = sub(p2, p1).unit();
	var p23 = sub(p3, p2).unit();
	var p30 = sub(p0, p3).unit();
	var N = cross(p01, p12).unit();
	var N01 = cross(N, p01).unit();
	var N12 = cross(N, p12).unit();
	var N23 = cross(N, p23).unit();
	var N30 = cross(N, p30).unit();

	if (dot(N, rayDir) >= 0 && !allowHitsFromBehind)
		return undefined;

	var pointOnPlane = intersectRayPlane(rayStart, rayDir, N, p0);

	var inside01 = dot(sub(pointOnPlane, p0), N01)>=0;
	var inside12 = dot(sub(pointOnPlane, p1), N12)>=0;
	var inside23 = dot(sub(pointOnPlane, p2), N23)>=0;
	var inside30 = dot(sub(pointOnPlane, p3), N30)>=0;

	if ( inside01 && inside12 && inside23 && inside30 )
		return pointOnPlane;

	return undefined;
}

function tetrahedronEdgeLengthFromHeight(h)
{
	return 3 * h / Math.sqrt(2);
}

function tetrahedronHeightFromEdgeLength(s)
{
	return s * Math.sqrt(2) / 3;
}

function tetrahedronEdgeLengthFromInscribedRadius(r)
{
	return 2 * Math.sqrt(3) * r;
}

function tetrahedronHeightFromInscribedRadius(r)
{
	return 2 * r * Math.sqrt(2) / Math.sqrt(3);
}

function getTetrahedronPoints(o, edgeLength, xAxis, yAxis, zAxis)
{
	var p = new Array(4);

	var height = tetrahedronHeightFromEdgeLength(edgeLength);

	p[0] = o.copy();
	p[1] = mad(xAxis, -edgeLength/2, mad(zAxis, -edgeLength / (2 * sqrt(3)), mad(yAxis, -height, o)));
	p[2] = mad(xAxis, +edgeLength/2, mad(zAxis, -edgeLength / (2 * sqrt(3)), mad(yAxis, -height, o)));
	p[3] = mad(xAxis, 0, mad(zAxis, edgeLength / sqrt(3), mad(yAxis, -height, o)));

	return p;
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