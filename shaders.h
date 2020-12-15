#ifndef SHADERS_H
#define SHADERS_H

#pragma once
#include <QtOpenGL>
#include <QOpenGLFunctions_4_3_Core>
#include <QGLWidget>
#include <QOpenGLWidget>

class shader : public QOpenGLWidget {
private:
    QOpenGLShaderProgram m_program;
    GLfloat* vert_data;
    int m_position;
    QOpenGLFunctions_4_3_Core* functions;
    GLuint ssbo = 0;
    struct Sphere {
        QVector3D position;
        float radius;
        QVector3D color;
        int material_idx;
    };

    struct Triangle {
        QVector3D v1;
        QVector3D v2;
        QVector3D v3;
        QVector3D color;
        int material_idx;
    };

protected:
    void initializeGL() override;
    void resizeGL(int nWidth, int nHeight) override;
    void paintGL() override;

public:
    shader(QWidget *parent = 0);
    ~shader();
};

#endif // SHADERS_H
