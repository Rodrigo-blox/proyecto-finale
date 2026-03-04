'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('naps', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      codigo: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      modelo: {
        type: Sequelize.STRING,
        allowNull: false
      },
      firmware: {
        type: Sequelize.STRING
      },
      estado: {
        type: Sequelize.ENUM('ACTIVO', 'MANTENIMIENTO', 'FUERA_SERVICIO', 'SATURADO'),
        allowNull: false,
        defaultValue: 'ACTIVO'
      },
      total_puertos: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      ubicacion: {
        type: Sequelize.STRING,
        allowNull: false
      },
      latitud: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: false
      },
      longitud: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('naps');
  }
};
