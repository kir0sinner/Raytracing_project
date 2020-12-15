#include "shaders.h"

shader::shader(QWidget *parent) : QOpenGLWidget(parent), m_position(0) {
    vert_data = new GLfloat[12];
    vert_data[0] = -1.0f; vert_data[1] = -1.0f; vert_data[2] = 0.0f;
    vert_data[3] = 1.0f;  vert_data[4] = -1.0f; vert_data[5] = 0.0f;
    vert_data[6] = 1.0f;  vert_data[7] = 1.0f;  vert_data[8] = 0.0f;
    vert_data[9] = -1.0f; vert_data[10] = 1.0f; vert_data[11] = 0.0f;
}

shader::~shader() {
    delete[] vert_data;
}

void shader::initializeGL() {
    glClearColor(1.0f, 1.0f, 1.0f, 1.0f);
    QOpenGLShader vShader(QOpenGLShader::Vertex);
    vShader.compileSourceFile(":resource/raytracing.vert");
    QOpenGLShader fShader(QOpenGLShader::Fragment);
    fShader.compileSourceFile(":resource/raytracing.frag");
    m_program.addShader(&vShader);
    m_program.addShader(&fShader);
    if (!m_program.link()) {
        qWarning("Error link");
        return;
    }
    m_position = m_program.attributeLocation("vertex");

    if (!m_program.bind()) {
        qWarning("error bind programm shader");
        return;
    }

    m_program.setUniformValue("camera.position", QVector3D(0.0, 0.0, -10));
    m_program.setUniformValue("camera.view", QVector3D(0.0, 0.0, 1.0));
    m_program.setUniformValue("camera.up", QVector3D(0.0, 1.0, 0.0));
    m_program.setUniformValue("camera.side", QVector3D(1.0, 0.0, 0.0));

    m_program.setUniformValue("scale", QVector2D(width(), height()));

    m_program.release();

    std::vector<Sphere> all_spheres;
    all_spheres.push_back(Sphere{ QVector3D(2, 0, 11), 16, QVector3D(0.07, 0.0, 0.28), 0 });
    all_spheres.push_back(Sphere{ QVector3D(-2, 1, -4.5), 2, QVector3D(0.93, 0.76, 0.26), 0 });
    all_spheres.push_back(Sphere{ QVector3D(1, -1, -4.5), 1.5, QVector3D(0.14, 0.63, 0.93), 0 });
    all_spheres.push_back(Sphere{ QVector3D(2, 1, -5.5), 0.5, QVector3D(0.94, 0.42, 0.96), 0 });


    functions = QOpenGLContext::currentContext()->versionFunctions<QOpenGLFunctions_4_3_Core>();
    functions->glGenBuffers(1, &ssbo);
    functions->glBindBuffer(GL_SHADER_STORAGE_BUFFER, ssbo);
    functions->glBufferData(GL_SHADER_STORAGE_BUFFER, all_spheres.size() * sizeof(Sphere), all_spheres.data(), GL_DYNAMIC_COPY);
    functions->glBindBufferBase(GL_SHADER_STORAGE_BUFFER, 0, ssbo);

}

void shader::resizeGL(int nWidth, int nHeight) {
    glViewport(0, 0, nWidth, nHeight);
    if (!m_program.bind()) {
        qWarning("error bind programm shader");
    }
    m_program.setUniformValue("scale", QVector2D(width(), height()));
    //qDebug() << "scale = " << QVector2D(width(), height());
    m_program.release();
}

void shader::paintGL() {
    glClear(GL_COLOR_BUFFER_BIT);
    if (!m_program.bind())
    {
        return;
    }
    m_program.enableAttributeArray(m_position);
    m_program.setAttributeArray(m_position, vert_data, 3);
    glDrawArrays(GL_QUADS, 0, 4);
    m_program.disableAttributeArray(m_position);
    m_program.release();
}
