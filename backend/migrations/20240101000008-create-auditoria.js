'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('auditoria', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      tabla: {
        type: Sequelize.STRING,
        allowNull: false
      },
      registro_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      accion: {
        type: Sequelize.ENUM('CREATE', 'UPDATE', 'DELETE'),
        allowNull: false
      },
      datos_anteriores: {
        type: Sequelize.TEXT
      },
      datos_nuevos: {
        type: Sequelize.TEXT
      },
      cambiado_por: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'usuarios',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      fecha: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('auditoria');
  }
};
