#include "mainwindow.h"
#include "shaders.h"

#include <QApplication>

int main(int argc, char *argv[])
{
    QApplication a(argc, argv);
    shader w(NULL);
    QSurfaceFormat format;
    format.setDepthBufferSize(24);
    format.setVersion(3, 5);
    format.setProfile(QSurfaceFormat::CoreProfile);
    w.setFormat(format);
    w.show();
    return a.exec();
}
