#version 430
#define EPSILON 0.001
#define BIG 1000000.0

struct Camera {
    vec3 position;
    vec3 view;
    vec3 up;
    vec3 side;
};

struct Ray {
    vec3 origin;
    vec3 direction;
};

struct Sphere {
    vec3 center;
    float radius;
    vec3 color;
    int material_idx;
};

struct Triangle {
    vec3 v1;
    vec3 v2;
    vec3 v3;
    vec3 color;
    int material_idx;
};

struct Material {
    vec4 light_coeffs;
};

struct Intersection {
    float time;
    vec3 point;
    vec3 normal;
    vec3 color;
    vec4 light_coeffs;
    int material_idx;
};

bool IntersectSphere(Sphere sphere, Ray ray, out float time) {
    ray.origin -= sphere.center;
    float A = dot(ray.direction, ray.direction);
    float B = dot(ray.direction, ray.origin);
    float C = dot(ray.origin, ray.origin) - sphere.radius * sphere.radius;
    float D = B * B - A * C;
    if (D > 0.0) {
        D = sqrt(D);
        float t1 = (-B - D) / A;
        float t2 = (-B + D) / A;

        if (t1 < 0 && t2 < 0)
            return false;

        if (min(t1, t2) < 0) {
            time = max(t1,t2);
            return true;
        }
        time = min(t1, t2);
        return true;
    }
    return false;
}

bool IntersectTriangle(Ray ray, vec3 v1, vec3 v2, vec3 v3, out float time ) {
    time = -1;
    vec3 A = v2 - v1;
    vec3 B = v3 - v1;
    vec3 N = cross(A, B);

    float NdotRayDirection = dot(N, ray.direction);
    if (abs(NdotRayDirection) < EPSILON)
        return false;

    float d = dot(N, v1);

    float t = -(dot(N, ray.origin) - d) / NdotRayDirection;

    if (t < 0)
        return false;

    vec3 P = ray.origin + t * ray.direction;

    vec3 C;

    vec3 edge1 = v2 - v1;
    vec3 VP1 = P - v1;
    C = cross(edge1, VP1);
    if (dot(N, C) < 0)
        return false;
    vec3 edge2 = v3 - v2;
    vec3 VP2 = P - v2;
    C = cross(edge2, VP2);
    if (dot(N, C) < 0)
        return false;

    vec3 edge3 = v1 - v3;
    vec3 VP3 = P - v3;
    C = cross(edge3, VP3);
    if (dot(N, C) < 0)
        return false;
    time = t;
    return true;
}
//in, out, uniform variables
in vec3 interpolated_vertex;
out vec4 FragColor;

//юниформ дл€ передачи переменных из хоста в любой шейдер
uniform Camera camera;//передаЄм координаты камеры
//отношение сторон выходного изображени€
uniform vec2 scale;

layout(std430, binding=0) buffer SphereBuffer{
        Sphere sphere_data[];
};

layout(std430, binding=1) buffer SphereTriangle{
        Triangle triangle_data[];
};


//scene
//Sphere sphere = {vec3(-1.0, -1.0,-2.0), 2, vec3(1.0,1.0,2.0), 0};
Material material={vec4(0.4, 0.9, 0.0, 512.0)};//материал Ђпо умолчаниюї
vec3 light_pos = vec3(1,0,-8);//позицию источника освещени€

//functions
Ray GenerateRay(Camera camera) {
        vec2 coords=interpolated_vertex.xy * normalize(scale);//необходимо, чтобы изображение не деформировалось при изменении размеров окна
        vec3 direction=camera.view + camera.side*coords.x + camera.up*coords.y;
        return Ray(camera.position, normalize(direction));
}

//пересекает луч со всеми примитивами сцены и возвращает ближайшее пересечение
bool Intersect(Ray ray, float start, float final, inout Intersection intersect) {
   bool result = false;
   float time = start;
   intersect.time = final;
   for(int i=0; i < sphere_data.length(); i++) {
     if(IntersectSphere(sphere_data[i], ray, time)&& time<intersect.time)
         {
           intersect.time = time;
           intersect.point= ray.origin + ray.direction*time;
           intersect.normal = normalize(intersect.point - sphere_data[i].center);
           intersect.color= sphere_data[i].color;
           intersect.light_coeffs = material.light_coeffs;
           result = true;
         }
   }
   for(int i = 0; i < triangle_data.length(); i++)
       if(IntersectTriangle(ray, triangle_data[i].v1, triangle_data[i].v2, triangle_data[i].v3, time) && time < intersect.time) {
           intersect.time = time;
           intersect.point= ray.origin + ray.direction * time;
           intersect.normal = normalize(cross(triangle_data[i].v1 - triangle_data[i].v2, triangle_data[i].v3 - triangle_data[i].v2));
           intersect.color = triangle_data[i].color;
           intersect.light_coeffs = material.light_coeffs;
           result = true;
           }
   return result;
}

//
float Shadow(vec3 pos_light, Intersection intersect)
{
  float shadowing=1.0;//точка освещена
  vec3 direction= normalize(pos_light - intersect.point);//вектор к источнику света
  float distanceLight = distance(pos_light, intersect.point);//рассто€ние до источника света
  Ray shadowRay = Ray(intersect.point + direction * EPSILON, direction);//генераци€ теневого луча
  Intersection shadowIntersect;
  shadowIntersect.time = BIG;
  // trace ray from shadow ray begining to light source position
  if(Intersect(shadowRay, 0, distanceLight, shadowIntersect))
  {
   shadowing = 0.0;//этот источник света невидим в точке пересечени€
  }
  return shadowing;
}


//освещение
//шейдинг (закрашивание) по ‘онгу (формула)
vec3 Phong(Intersection intersect, vec3 pos_light, float shadow)
{
  vec3 light = normalize(pos_light - intersect.point);
  float diffuse = max(dot(light, intersect.normal), 0.0);
  vec3 view = normalize(camera.position - intersect.point);
  vec3 reflected = reflect(-view, intersect.normal);
  float specular = pow(max(dot(reflected, light), 0.0), intersect.light_coeffs.w);
  return intersect.light_coeffs.x * intersect.color+
         intersect.light_coeffs.y * diffuse*intersect.color * shadow+
                 intersect.light_coeffs.z * specular;
}

//трассирует луч
vec4 Raytrace(Ray primary_ray)
{
  vec4 resultcolor= vec4(0,0,0,0);
  Ray ray = primary_ray;
  Intersection intersect;
  intersect.time = BIG;
  float start =0 ;
  float final = BIG;
  if(Intersect(ray, start, final, intersect))
  {
   float shadowing = Shadow(light_pos, intersect);
   resultcolor += vec4(Phong(intersect, light_pos, shadowing), 0);
  }
  return resultcolor;
}


//записывает интерполированные координаты в выходной буфер цвета
void main(void)
{
 //FragColor = vec4(abs(interpolated_vertex.xy), 0, 1.0);
 Ray ray=GenerateRay(camera);
 FragColor = Raytrace(ray);
 //FragColor=vec4(abs(ray.direction.xy),0,1.0);//abs (модуль) примен€етс€ потому, что компонента цвета не может быть отрицательной, а наши интерполированные значени€ лежат в диапазоне от -1 до 1
 //FragColor=vec4(abs(camera.up),1.0);
}
