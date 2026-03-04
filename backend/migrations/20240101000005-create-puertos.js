'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('puertos', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      nap_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'naps',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      numero: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      estado: {
        type: Sequelize.ENUM('LIBRE', 'OCUPADO', 'MANTENIMIENTO'),
        allowNull: false,
        defaultValue: 'LIBRE'
      },
      nota: {
        type: Sequelize.TEXT
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

    await queryInterface.addIndex('puertos', ['nap_id', 'numero'], { unique: true });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('puertos');
  }
};
