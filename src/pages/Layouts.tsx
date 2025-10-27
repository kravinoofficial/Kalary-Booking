import React, { useState, useEffect } from 'react'
import { supabase, Layout } from '../lib/supabase'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'

const Layouts: React.FC = () => {
  const [layouts, setLayouts] = useState<Layout[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingLayout, setEditingLayout] = useState<Layout | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    structure: {
      sections: [
        { name: 'North', rows: 5, seatsPerRow: 10, price: 100 },
        { name: 'South', rows: 5, seatsPerRow: 10, price: 100 },
        { name: 'East', rows: 3, seatsPerRow: 8, price: 150 },
        { name: 'West', rows: 3, seatsPerRow: 8, price: 150 }
      ]
    }
  })

  useEffect(() => {
    fetchLayouts()
  }, [])

  const fetchLayouts = async () => {
    try {
      const { data, error } = await supabase
        .from('layouts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setLayouts(data || [])
    } catch (error) {
      console.error('Error fetching layouts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const layoutData = {
        name: formData.name,
        structure: formData.structure
      }

      if (editingLayout) {
        const { error } = await supabase
          .from('layouts')
          .update(layoutData)
          .eq('id', editingLayout.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('layouts')
          .insert([layoutData])
        
        if (error) throw error
      }

      setShowModal(false)
      setEditingLayout(null)
      resetForm()
      fetchLayouts()
    } catch (error) {
      console.error('Error saving layout:', error)
    }
  }

  const handleEdit = (layout: Layout) => {
    setEditingLayout(layout)
    setFormData({
      name: layout.name,
      structure: layout.structure
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this layout?')) {
      try {
        const { error } = await supabase
          .from('layouts')
          .delete()
          .eq('id', id)
        
        if (error) throw error
        fetchLayouts()
      } catch (error) {
        console.error('Error deleting layout:', error)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      structure: {
        sections: [
          { name: 'North', rows: 5, seatsPerRow: 10, price: 100 },
          { name: 'South', rows: 5, seatsPerRow: 10, price: 100 },
          { name: 'East', rows: 3, seatsPerRow: 8, price: 150 },
          { name: 'West', rows: 3, seatsPerRow: 8, price: 150 }
        ]
      }
    })
  }

  const updateSection = (index: number, field: string, value: any) => {
    const newSections = [...formData.structure.sections]
    newSections[index] = { ...newSections[index], [field]: value }
    setFormData({
      ...formData,
      structure: { ...formData.structure, sections: newSections }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Theatre Layouts</h1>
          <p className="text-gray-600 mt-2">Design and manage 360° seating arrangements</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setEditingLayout(null)
            setShowModal(true)
          }}
          className="bg-primary-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-700 transition-colors flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Layout
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {layouts.map((layout) => (
          <div key={layout.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{layout.name}</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(layout)}
                  className="text-primary-600 hover:text-primary-900"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDelete(layout.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {layout.structure.sections?.map((section: any, index: number) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-600">{section.name}</span>
                  <span className="text-gray-900">
                    {section.rows}R × {section.seatsPerRow}S (₹{section.price})
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                Total Seats: {layout.structure.sections?.reduce((total: number, section: any) => 
                  total + (section.rows * section.seatsPerRow), 0
                )}
              </div>
            </div>

            {/* Clean theater-style visual representation */}
            <div className="mt-4 bg-gray-50 rounded-xl p-4 h-40">
              <div className="flex flex-col items-center justify-center h-full space-y-2">
                
                {/* North section indicator */}
                <div className="flex space-x-1">
                  {Array.from({ length: Math.min(layout.structure.sections?.find((s: any) => s.name === 'North')?.seatsPerRow || 0, 8) }, (_, i) => (
                    <div key={i} className="w-2 h-1.5 bg-gray-300 rounded-sm"></div>
                  ))}
                </div>
                <div className="text-xs text-gray-500 font-medium">NORTH</div>
                
                {/* Middle section with West, Stage, East */}
                <div className="flex items-center justify-center space-x-4 w-full">
                  {/* West */}
                  <div className="flex flex-col items-center space-y-1">
                    <div className="text-xs text-gray-500 font-medium">WEST</div>
                    <div className="flex flex-col space-y-0.5">
                      {Array.from({ length: Math.min(layout.structure.sections?.find((s: any) => s.name === 'West')?.rows || 0, 3) }, (_, i) => (
                        <div key={i} className="flex space-x-0.5">
                          {Array.from({ length: Math.min(layout.structure.sections?.find((s: any) => s.name === 'West')?.seatsPerRow || 0, 3) }, (_, j) => (
                            <div key={j} className="w-1.5 h-1.5 bg-gray-300 rounded-sm"></div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Central Stage */}
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm">
                      STAGE
                    </div>
                    <div className="text-xs text-gray-400 mt-1">Kalary</div>
                  </div>
                  
                  {/* East */}
                  <div className="flex flex-col items-center space-y-1">
                    <div className="text-xs text-gray-500 font-medium">EAST</div>
                    <div className="flex flex-col space-y-0.5">
                      {Array.from({ length: Math.min(layout.structure.sections?.find((s: any) => s.name === 'East')?.rows || 0, 3) }, (_, i) => (
                        <div key={i} className="flex space-x-0.5">
                          {Array.from({ length: Math.min(layout.structure.sections?.find((s: any) => s.name === 'East')?.seatsPerRow || 0, 3) }, (_, j) => (
                            <div key={j} className="w-1.5 h-1.5 bg-gray-300 rounded-sm"></div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* South section indicator */}
                <div className="text-xs text-gray-500 font-medium">SOUTH</div>
                <div className="flex space-x-1">
                  {Array.from({ length: Math.min(layout.structure.sections?.find((s: any) => s.name === 'South')?.seatsPerRow || 0, 8) }, (_, i) => (
                    <div key={i} className="w-2 h-1.5 bg-gray-300 rounded-sm"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingLayout ? 'Edit Layout' : 'Create New Layout'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Layout Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., Main Hall Layout"
                />
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Sections</h3>
                <div className="space-y-4">
                  {formData.structure.sections.map((section, index) => (
                    <div key={index} className="bg-gray-50 rounded-xl p-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Section Name
                          </label>
                          <input
                            type="text"
                            value={section.name}
                            onChange={(e) => updateSection(index, 'name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Rows
                          </label>
                          <input
                            type="number"
                            value={section.rows}
                            onChange={(e) => updateSection(index, 'rows', parseInt(e.target.value))}
                            min="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Seats/Row
                          </label>
                          <input
                            type="number"
                            value={section.seatsPerRow}
                            onChange={(e) => updateSection(index, 'seatsPerRow', parseInt(e.target.value))}
                            min="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Price (₹)
                          </label>
                          <input
                            type="number"
                            value={section.price}
                            onChange={(e) => updateSection(index, 'price', parseInt(e.target.value))}
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-primary-700 transition-colors"
                >
                  {editingLayout ? 'Update' : 'Create'} Layout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Layouts