# Componentes reutilizables propios de la aplicación.

# Aquí van controles genéricos que no conocen las reglas de un módulo.

#

# Button.tsx envuelve Base UI Button y ofrece variantes de aspecto y tamaño.

# Dialog.tsx presenta contenido variable en una ventana modal accesible; cada módulo

# conserva dentro de sí el estado y las reglas de negocio de su flujo.

# InputField.tsx compone un label y un input opcionalmente adornado con iconos

# y contenido adicional. El módulo consumidor provee sus clases para conservar

# el estilo visual propio de cada formulario.

# PasswordChangeForm.tsx comparte los campos de contraseña nueva y confirmación,

# sus requisitos, validación y controles para mostrar u ocultar el texto. Los

# módulos conservan separados los flujos que presentan este formulario.
